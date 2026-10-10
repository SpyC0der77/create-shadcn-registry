Output docs/images/cli-demo.gif
Require node
Require git
Set Shell "powershell"
Set Width 1000
Set Height 650
Set FontSize 20
Set TypingSpeed 35ms
Set Framerate 10
Hide
Type "$work = & ./docs/demo/prepare.ps1; Set-Location $work; function prompt { 'demo> ' }; Clear-Host"
Enter
Sleep 1s
Show
Type "node bin/index.js --registry-name demo-ui --project-location registry --style new-york --homepage https://example.com"
Enter
Sleep 5s
Down
Enter
Sleep 500ms
Enter
Sleep 2s
Type "Get-Content registry/registry.json -TotalCount 12"
Enter
Sleep 3s
