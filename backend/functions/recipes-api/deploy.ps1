param([string]$deploy)
Compress-Archive -Path index.js,package.json,node_modules -DestinationPath function.zip -Force
if ($deploy -eq '--deploy') {
	aws lambda update-function-code --function-name recipes-api --zip-file fileb://function.zip
}
