# 甜甜的饮食管理 - Windows 桌面启动器
# 用 Edge App 模式打开，效果类似桌面软件

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$htmlPath = Join-Path $scriptDir "src\index.html"
$fileUrl = "file:///" + ($htmlPath -replace '\\', '/')

# 尝试 Microsoft Edge App 模式（无边框窗口，像桌面软件）
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

if (Test-Path $edgePath) {
    Start-Process -FilePath $edgePath -ArgumentList "--app=$fileUrl", "--window-size=430,850"
} else {
    # 尝试 Chrome
    $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    if (-not (Test-Path $chromePath)) {
        $chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    }
    if (Test-Path $chromePath) {
        Start-Process -FilePath $chromePath -ArgumentList "--app=$fileUrl", "--window-size=430,850"
    } else {
        # 都没装就用默认浏览器
        Start-Process $htmlPath
    }
}

Write-Host "甜甜的饮食管理 启动完成！" -ForegroundColor Magenta
