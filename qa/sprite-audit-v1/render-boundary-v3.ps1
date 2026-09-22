param(
    [string]$Source = (Join-Path $PSScriptRoot '..\..\reference\jelly-anthropomorphic-player-walk.png'),
    [string]$Output = (Join-Path $PSScriptRoot 'v3-original-right-up-boundary.png')
)

Add-Type -AssemblyName System.Drawing

$sourceBitmap = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Source).Path)
$panelWidth = 560
$panelHeight = 380
$canvas = New-Object System.Drawing.Bitmap(($panelWidth * 3), $panelHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
$graphics.Clear([System.Drawing.Color]::White)
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$smallFont = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Regular)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 25, 35, 55))
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 210, 35, 55), 2)

function Draw-Checker {
    param([System.Drawing.Graphics]$Target, [int]$X, [int]$Y, [int]$Width, [int]$Height)
    $size = 16
    $light = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 246, 248, 252))
    $dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 220, 226, 235))
    for ($y = 0; $y -lt $Height; $y += $size) {
        for ($x = 0; $x -lt $Width; $x += $size) {
            $b = if (([int](($x / $size) + ($y / $size)) % 2) -eq 0) { $light } else { $dark }
            $Target.FillRectangle($b, $X + $x, $Y + $y, [Math]::Min($size, $Width - $x), [Math]::Min($size, $Height - $y))
        }
    }
    $light.Dispose()
    $dark.Dispose()
}

function Draw-NearestRegion {
    param(
        [System.Drawing.Bitmap]$SourceBitmap,
        [System.Drawing.Graphics]$Target,
        [int]$SourceX,
        [int]$SourceY,
        [int]$SourceWidth,
        [int]$SourceHeight,
        [int]$DestinationX,
        [int]$DestinationY,
        [int]$DestinationWidth,
        [int]$DestinationHeight
    )
    $scaled = New-Object System.Drawing.Bitmap($DestinationWidth, $DestinationHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    for ($dy = 0; $dy -lt $DestinationHeight; $dy++) {
        $sy = [Math]::Min($SourceHeight - 1, [int][Math]::Floor($dy * $SourceHeight / [double]$DestinationHeight))
        for ($dx = 0; $dx -lt $DestinationWidth; $dx++) {
            $sx = [Math]::Min($SourceWidth - 1, [int][Math]::Floor($dx * $SourceWidth / [double]$DestinationWidth))
            $scaled.SetPixel($dx, $dy, $SourceBitmap.GetPixel($SourceX + $sx, $SourceY + $sy))
        }
    }
    $Target.DrawImageUnscaled($scaled, $DestinationX, $DestinationY)
    $scaled.Dispose()
}

for ($column = 0; $column -lt 3; $column++) {
    $panelX = $column * $panelWidth
    Draw-Checker -Target $graphics -X ($panelX + 10) -Y 42 -Width 540 -Height 320
    $sourceX = ($column * 374) + 100
    Draw-NearestRegion -SourceBitmap $sourceBitmap -Target $graphics -SourceX $sourceX -SourceY 1034 -SourceWidth 180 -SourceHeight 22 -DestinationX ($panelX + 10) -DestinationY 42 -DestinationWidth 540 -DestinationHeight 66
    $graphics.DrawLine($pen, $panelX + 10, 108, $panelX + 550, 108)
    Draw-NearestRegion -SourceBitmap $sourceBitmap -Target $graphics -SourceX $sourceX -SourceY 1056 -SourceWidth 180 -SourceHeight 60 -DestinationX ($panelX + 10) -DestinationY 110 -DestinationWidth 540 -DestinationHeight 180
    $graphics.DrawRectangle($pen, $panelX + 10, 42, 539, 247)
    $graphics.DrawString(("column {0} - original RIGHT bottom -> UP top" -f $column), $font, $brush, $panelX + 10, 8)
    $graphics.DrawString('top: RIGHT source y=1034..1055', $smallFont, $brush, $panelX + 10, 300)
    $graphics.DrawString('bottom: UP source y=1056..1115', $smallFont, $brush, $panelX + 10, 320)
}

$outputPath = [System.IO.Path]::GetFullPath($Output)
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputPath) | Out-Null
$canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$font.Dispose()
$smallFont.Dispose()
$brush.Dispose()
$pen.Dispose()
$canvas.Dispose()
$sourceBitmap.Dispose()
Write-Output ("wrote {0}" -f $outputPath)
