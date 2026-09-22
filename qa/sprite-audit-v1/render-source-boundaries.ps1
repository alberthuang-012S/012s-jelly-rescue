param(
    [string]$Source = (Join-Path $PSScriptRoot '..\..\reference\jelly-anthropomorphic-player-walk.png'),
    [string]$Output = (Join-Path $PSScriptRoot 'source-boundaries.png')
)

Add-Type -AssemblyName System.Drawing

$cellWidth = 374
$cellHeight = 352
$scale = 4
$boundaryHeight = 48
$directions = @('down', 'left', 'right', 'up')
$sourceBitmap = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Source).Path)
$panelWidth = $cellWidth * $scale
$panelHeight = ($boundaryHeight * 2) * $scale
$outputBitmap = New-Object System.Drawing.Bitmap(($panelWidth * 3), ($panelHeight * 2), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($outputBitmap)
$graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$graphics.Clear([System.Drawing.Color]::White)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

function Draw-Checker {
    param([System.Drawing.Graphics]$Target, [int]$X, [int]$Y, [int]$Width, [int]$Height)
    $size = 16
    $light = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 247, 249, 253))
    $dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 218, 226, 237))
    for ($y = 0; $y -lt $Height; $y += $size) {
        for ($x = 0; $x -lt $Width; $x += $size) {
            $brush = if ((($x / $size) + ($y / $size)) % 2 -eq 0) { $light } else { $dark }
            $Target.FillRectangle($brush, $X + $x, $Y + $y, [Math]::Min($size, $Width - $x), [Math]::Min($size, $Height - $y))
        }
    }
    $light.Dispose(); $dark.Dispose()
}

$font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$labelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 20, 30, 50))
$boundaryPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 210, 35, 55), 2)

for ($column = 0; $column -lt 3; $column++) {
    $sourceX = $column * $cellWidth
    $panelX = $column * $panelWidth
    $label = "RIGHT $column -> UP $column"
    Draw-Checker -Target $graphics -X $panelX -Y 0 -Width $panelWidth -Height $panelHeight
    $rightRectangle = [System.Drawing.Rectangle]::new($panelX, 0, $panelWidth, $boundaryHeight * $scale)
    $upRectangle = [System.Drawing.Rectangle]::new($panelX, $boundaryHeight * $scale, $panelWidth, $boundaryHeight * $scale)
    $graphics.DrawImage($sourceBitmap, $rightRectangle, $sourceX, (2 * $cellHeight) + ($cellHeight - $boundaryHeight), $cellWidth, $boundaryHeight, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.DrawImage($sourceBitmap, $upRectangle, $sourceX, 3 * $cellHeight, $cellWidth, $boundaryHeight, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.DrawLine($boundaryPen, $panelX, $boundaryHeight * $scale, $panelX + $panelWidth, $boundaryHeight * $scale)
    $graphics.DrawString($label, $font, $labelBrush, $panelX + 8, 8)
}

$outputPath = [System.IO.Path]::GetFullPath($Output)
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputPath) | Out-Null
$graphics.Dispose()
$outputBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$outputBitmap.Dispose()
$sourceBitmap.Dispose()
Write-Output "wrote $outputPath"
