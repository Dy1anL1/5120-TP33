# Recipe Classification System - DynamoDB Design

## 概述 (Overview)

本文档描述了食谱自动分类系统的设计方案，旨在修复现有误判问题并新增"饮料"主类。

## 现有问题 (Current Issues)

1. **汤类误判**：只要 ingredients 含 chicken/vegetable broth 就被判成 soup，导致 fried rice/risotto/stir-fry/pilaf 误判
2. **匹配过宽**：toast 命中 toaster，bar 命中 barbecue/barley，nuts 让甜品变成 snack
3. **沙拉规则过严**：chicken/tuna salad 被排除，不符合用户直觉
4. **触发过粗**：只出现 pasta/rice/noodle/chicken 就归到 lunch+dinner
5. **默认分类错误**：饮料等非正餐被错误归为 dinner

## 分类大纲 (Classification Structure)

### 主类优先级 (Primary Categories - Mutually Exclusive)
```
dessert → beverage → soup → breakfast → snack → salad → main(lunch/dinner) → other
```
**说明**：命中前面的就不再往后判断

### 规则细化 (Detailed Rules)

#### 1. Dessert（最高优先级）
- **触发词**：chocolate cake, brownie, cheesecake, ice cream, mousse, tiramisu, cupcake, pudding
- **逻辑**：命中则直接归为 dessert，不再判断其他主类

#### 2. Beverage（新增"饮料"主类）
- **触发词**：smoothie, juice, milkshake/shake, lemonade, tea/iced tea/matcha/chai, coffee/latte/mocha/espresso, hot chocolate/cocoa, kombucha, soda/spritzer, punch, mocktail/cocktail, frappe
- **二级标签自动派生**：
  - `hot|cold`：标题/配料出现 hot/warm 算 hot，否则 cold
  - `alcoholic|non_alcoholic`：出现酒精类词则 alcoholic
  - `caffeinated`：coffee/espresso/matcha/tea
  - `dairy_based`：milk/cream/yogurt/ice cream
  - `fruit_based`：banana/strawberry/mango/berry/orange/lemon/pineapple/fruit
  - **类型标签**：tea|coffee|smoothie|cocktail

#### 3. Soup（多信号打分 + 强否决）
- **强肯定（加分）**：
  - 标题含 soup/chowder/bisque/pho/ramen/gazpacho/congee/noodle soup → 强加分
  - 步骤动词：simmer/bring to a boil/ladle/serve hot/stockpot/purée → 加分
  - 液体占比：汤底用量 ≥ 3 cups → 加分
- **强否决（直接排除）**：
  - 标题含：fried rice, risotto, pilaf, paella, biryani, stir-fry, casserole, baked pasta, noodle stir-fry
  - 标题含：stew/chili/goulash/curry → 倾向主菜
- **阈值**：总分 ≥ 3 才归为 soup

#### 4. Breakfast
- **触发词**：breakfast/morning/pancake/waffle/oatmeal/overnight oats/cereal/granola/muesli/porridge/toast/muffin/bagel/scone/omelet/omelette/scrambled eggs/fried eggs/brunch/hash brown/frittata/french toast

#### 5. Snack
- **精确短语**：chips, dip, trail mix, jerky, energy ball/energy bites, granola bar, protein bar, popcorn, crackers
- **注意**：不使用裸词 bar, nuts 避免误伤

#### 6. Salad（放宽规则）
- **主规则**：标题含 salad → 主类 salad
- **蛋白沙拉**：配料含 chicken/beef/pork/ham/bacon/turkey/tuna/salmon/shrimp/prawn/tofu/tempeh/egg/eggs/chickpea → 加二级标签 `protein_salad`
- **重要**：不因有蛋白就把沙拉踢出 salad 主类

#### 7. Main（lunch/dinner）
- **lunch**：便携/夹馅类：lunch/sandwich/wrap/burger/burrito/taco/pita/panini/sub
- **dinner**：热主菜/复杂烹饪：dinner/casserole/stew/roast/pasta/rice/noodle/stir-fry/gratin/curry
- **组合判断**：主蛋白 + 主食同时出现 → 倾向 dinner
- **冲突处理**：两者都命中时，primary 取 dinner，all 包含 lunch 与 dinner

#### 8. Other（兜底）
- **条件**：上述都没命中
- **处理**：主类设为 other，不默认为 dinner

## 实施要求 (Implementation Requirements)

### 匹配方式
- **词边界匹配**：避免 toast→toaster, bar→barley/barbecue, nut→donut 误伤
- **多词短语**：按原序匹配（如 "granola bar", "noodle soup"）

### 可解释性
- **debug 字段**：返回 reasons + secondary_tags，记录命中规则名称
- **便于排查**：支持后续日志分析与调参

### 未分类处理
```javascript
// 如果没命中任何主类，返回 null 或 skip
if (!category_matched) {
  return {
    skip: true,
    reason: ["no_category_matched"]
  }
}
// 不要写入数据库，跳过未分类食谱
```

## 验收样例 (Test Cases)

| 食谱 | 期望分类 | 原因 |
|------|----------|------|
| Chicken Fried Rice (含 chicken broth 1/2 cup) | main: dinner | 强否决汤类 |
| Mushroom Risotto (含 vegetable stock) | main: dinner | 强否决汤类 |
| Beef Noodle Soup | soup | 标题强肯定 |
| Greek Salad with Chicken | salad + protein_salad | 放宽沙拉规则 |
| Strawberry Banana Smoothie | beverage + [cold, non_alcoholic, fruit_based, smoothie] | 新饮料类 |
| Iced Latte | beverage + [cold, caffeinated, coffee] | 新饮料类 |
| Granola Bar | snack | 精确短语匹配 |
| 无法匹配的食谱 | skip | 不强制分类 |

## 总体流程 (Classification Workflow)

### Phase 1: 简化版实施 + 保底措施

#### 核心原则
1. **主类判定**：严格按优先级，硬编码关键词匹配
2. **基础二级标签**：只实现核心标签（hot/cold, coffee/tea/smoothie/juice）
3. **基本过滤**：主类冲突标签直接删除
4. **保底措施**：防止明显误判和数据污染

#### 关键保底措施
```javascript
// 1. Soup 强否决列表（必须有）
const SOUP_NEGATIVES = [
  'fried rice', 'risotto', 'pilaf', 'stir-fry',
  'paella', 'biryani', 'casserole', 'baked pasta'
]

// 2. 饮料二级标签（核心几个）
function getBeverageTags(title) {
  const tags = []
  // 温度：hot/cold
  if (title.includes('hot|warm')) tags.push('hot')
  else tags.push('cold') // 默认cold

  // 类型：coffee/tea/smoothie/juice
  if (title.includes('coffee|latte|espresso')) tags.push('coffee')
  if (title.includes('tea|chai|matcha')) tags.push('tea')
  if (title.includes('smoothie|shake')) tags.push('smoothie')
  if (title.includes('juice')) tags.push('juice')

  return tags
}

// 3. 最小 Debug（轻量级）
function classifyRecipe(recipe) {
  const debug = { title: recipe.title, rules: [] }
  // 每个判断都记录原因
  return { primary, secondary, debug }
}

// 4. 未命中处理（数据清洁）
function processRecipes(recipes) {
  const results = { categorized: [], skipped: [] }

  recipes.forEach(recipe => {
    const classification = classifyRecipe(recipe)

    if (classification.primary === 'uncategorized') {
      results.skipped.push({ title: recipe.title, reason: classification.debug.rules })
    } else {
      results.categorized.push({ ...recipe, classification })
    }
  })

  return results
}
```

#### 简化版优势
- **防住最大坑**：Soup 否决列表 + 未命中处理
- **可见性**：Debug 信息 + Skip 统计
- **渐进扩展**：框架支持后续复杂功能
- **实用性**：核心标签覆盖90%场景，2-3天可实现

### Phase 2: 完整版扩展
1. **主类判定**（互斥）
2. **候选标签生成**（广撒网）
3. **主类约束过滤**（白/黑名单）
4. **冲突消解**（互斥标签处理）
5. **审计与阈值**（debug 信息记录）

## 配置参数化 (Configuration)

```javascript
const CLASSIFICATION_CONFIG = {
  soup: {
    threshold: 3,
    negativeWeight: -2,
    strongPositive: ['soup', 'chowder', 'pho', 'ramen'],
    strongNegative: ['fried rice', 'risotto', 'pilaf', 'stir-fry']
  },
  beverage: {
    titleWeight: 2,
    ingredientWeight: 1,
    keywords: ['smoothie', 'juice', 'latte', 'tea', 'coffee']
  }
  // ... 其他配置
}
```

## 注意事项 (Important Notes)

1. **渐进实施**：先实现简化版验证效果，再逐步完善
2. **测试驱动**：准备100个典型误判案例作为测试集
3. **可调参数**：关键阈值和权重需要根据真实数据调优
4. **性能考虑**：复杂打分机制可能影响处理速度，需要平衡准确性和性能

---

*最后更新：2025-09-17*