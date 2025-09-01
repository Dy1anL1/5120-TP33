echo "Deploying nutrition-match-api..."
#!/bin/bash
set -e
zip -r function.zip index.js package.json node_modules > /dev/null
if [[ "$1" == "--deploy" ]]; then
	aws lambda update-function-code --function-name nutrition-match-api --zip-file fileb://function.zip
fi
