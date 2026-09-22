param(
    [string]$Before = (Join-Path $PSScriptRoot '..\..\reference\jelly-anthropomorphic-player-walk.png'),
    [string]$After = (Join-Path $PSScriptRoot '..\..\reference\runtime\jelly-anthropomorphic-player-walk-v2.png'),
    [string]$OutputRoot = $PSScriptRoot
)

Add-Type -AssemblyName System.Drawing

$cellWidth = 374
$cellHeight = 352
$columns = 3
$rows = 4
$previewWidth = 420
$previewHeight = 400
$previewLeft = 23
$previewTop = 38
$checkerSize = 16
$directions = @('down', 'left', 'right', 'up')
$frameLabels = @('0', '1', '2')
# Count every non-zero alpha pixel so faint resampling residue is caught too.
$alphaThreshold = 8

function New-ArgbBitmap {
    param([int]$Width, [int]$Height)
    New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function Draw-Checkerboard {
    param(
        [System.Drawing.Graphics]$Graphics,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height
    )

    $light = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 246, 248, 252))
    $dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 220, 226, 235))
    for ($y = 0; $y -lt $Height; $y += $checkerSize) {
        for ($x = 0; $x -lt $Width; $x += $checkerSize) {
            $brush = if ((($x / $checkerSize) + ($y / $checkerSize)) % 2 -eq 0) { $light } else { $dark }
            $drawWidth = [Math]::Min($checkerSize, $Width - $x)
            $drawHeight = [Math]::Min($checkerSize, $Height - $y)
            $Graphics.FillRectangle($brush, $X + $x, $Y + $y, $drawWidth, $drawHeight)
        }
    }
    $light.Dispose()
    $dark.Dispose()
}

function Get-AlphaMetrics {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [int]$X0,
        [int]$Y0,
        [int]$Width,
        [int]$Height,
        [int]$Threshold
    )

    $minX = $Width
    $minY = $Height
    $maxX = -1
    $maxY = -1
    $edgeTop = 0
    $edgeBottom = 0
    $edgeLeft = 0
    $edgeRight = 0
    $edgeAnyTop = 0
    $edgeAnyBottom = 0
    $edgeAnyLeft = 0
    $edgeAnyRight = 0
    $opaquePixels = 0

    for ($y = 0; $y -lt $Height; $y++) {
        for ($x = 0; $x -lt $Width; $x++) {
            $alpha = $Bitmap.GetPixel($X0 + $x, $Y0 + $y).A
            if ($alpha -gt 0) {
                if ($y -eq 0) { $edgeAnyTop++ }
                if ($y -eq ($Height - 1)) { $edgeAnyBottom++ }
                if ($x -eq 0) { $edgeAnyLeft++ }
                if ($x -eq ($Width - 1)) { $edgeAnyRight++ }
            }
            if ($alpha -gt $Threshold) {
                $opaquePixels++
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
                if ($y -eq 0) { $edgeTop++ }
                if ($y -eq ($Height - 1)) { $edgeBottom++ }
                if ($x -eq 0) { $edgeLeft++ }
                if ($x -eq ($Width - 1)) { $edgeRight++ }
            }
        }
    }

    [pscustomobject]@{
        bbox = if ($maxX -ge 0) { @($minX, $minY, $maxX, $maxY) } else { @() }
        opaquePixels = $opaquePixels
        edgeAlpha = [pscustomobject]@{
            top = $edgeTop
            bottom = $edgeBottom
            left = $edgeLeft
            right = $edgeRight
        }
        edgeAnyAlpha = [pscustomobject]@{
            top = $edgeAnyTop
            bottom = $edgeAnyBottom
            left = $edgeAnyLeft
            right = $edgeAnyRight
        }
        padding = if ($maxX -ge 0) {
            [pscustomobject]@{
                top = $minY
                bottom = ($Height - 1) - $maxY
                left = $minX
                right = ($Width - 1) - $maxX
            }
        } else { $null }
    }
}

function Save-Png {
    param([System.Drawing.Bitmap]$Bitmap, [string]$Path)
    $parent = Split-Path -Parent $Path
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Force }
    $Bitmap.Save([System.IO.Path]::GetFullPath($Path), [System.Drawing.Imaging.ImageFormat]::Png)
}

function Render-Source {
    param(
        [string]$SourcePath,
        [string]$Variant,
        [string]$VariantDirectory
    )

    $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $SourcePath).Path)
    $metrics = @()
    $grid = New-ArgbBitmap -Width ($previewWidth * $columns) -Height ($previewHeight * $rows)
    $gridGraphics = [System.Drawing.Graphics]::FromImage($grid)
    $gridGraphics.Clear([System.Drawing.Color]::White)
    $gridGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $gridGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
    $smallFont = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Regular)
    $labelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 25, 35, 55))
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 210, 35, 55), 2)

    for ($row = 0; $row -lt $rows; $row++) {
        for ($column = 0; $column -lt $columns; $column++) {
            $sourceX = $column * $cellWidth
            $sourceY = $row * $cellHeight
            $direction = $directions[$row]
            $frame = $frameLabels[$column]
            $previewX = $column * $previewWidth
            $previewY = $row * $previewHeight
            $canvasX = $previewX + $previewLeft
            $canvasY = $previewY + $previewTop

            $single = New-ArgbBitmap -Width $previewWidth -Height $previewHeight
            $singleGraphics = [System.Drawing.Graphics]::FromImage($single)
            $singleGraphics.Clear([System.Drawing.Color]::White)
            $singleGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
            $singleGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
            Draw-Checkerboard -Graphics $singleGraphics -X $previewLeft -Y $previewTop -Width $cellWidth -Height $cellHeight
            $singleDestinationRectangle = New-Object System.Drawing.Rectangle($previewLeft, $previewTop, $cellWidth, $cellHeight)
            $singleGraphics.DrawImage($source, $singleDestinationRectangle, $sourceX, $sourceY, $cellWidth, $cellHeight, [System.Drawing.GraphicsUnit]::Pixel)
            $singleGraphics.DrawRectangle($borderPen, $previewLeft, $previewTop, $cellWidth - 1, $cellHeight - 1)
            $singleGraphics.DrawString(("{0}  frame {1}" -f $direction.ToUpperInvariant(), $frame), $font, $labelBrush, 6, 5)
            $singleGraphics.DrawString(("sourceX={0} sourceY={1} sourceWidth={2} sourceHeight={3}" -f $sourceX, $sourceY, $cellWidth, $cellHeight), $smallFont, $labelBrush, 6, 22)
            # Reuse the verified single-frame render for the contact sheet. This
            # avoids GDI+'s source-rectangle resampling artifact on a large atlas.
            $gridGraphics.DrawImageUnscaled($single, $previewX, $previewY)
            Save-Png -Bitmap $single -Path (Join-Path $VariantDirectory ("{0}-frame-{1}.png" -f $direction, $frame))
            $singleGraphics.Dispose()
            $single.Dispose()

            $frameMetrics = Get-AlphaMetrics -Bitmap $source -X0 $sourceX -Y0 $sourceY -Width $cellWidth -Height $cellHeight -Threshold $alphaThreshold
            $metrics += [pscustomobject]@{
                direction = $direction
                frame = [int]$frame
                sourceX = $sourceX
                sourceY = $sourceY
                sourceWidth = $cellWidth
                sourceHeight = $cellHeight
                metrics = $frameMetrics
            }
        }
    }

    Save-Png -Bitmap $grid -Path (Join-Path $OutputRoot ("{0}-grid.png" -f $Variant))
    $gridGraphics.Dispose()
    $grid.Dispose()
    $borderPen.Dispose()
    $labelBrush.Dispose()
    $font.Dispose()
    $smallFont.Dispose()
    $source.Dispose()
    return $metrics
}

$beforeDirectory = Join-Path $OutputRoot 'before'
$afterDirectory = Join-Path $OutputRoot 'after'
New-Item -ItemType Directory -Force -Path $beforeDirectory, $afterDirectory | Out-Null
$beforeMetrics = Render-Source -SourcePath $Before -Variant 'before' -VariantDirectory $beforeDirectory
$afterMetrics = Render-Source -SourcePath $After -Variant 'after' -VariantDirectory $afterDirectory

$report = [pscustomobject]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    layout = [pscustomobject]@{
        columns = $columns
        rows = $rows
        frameWidth = $cellWidth
        frameHeight = $cellHeight
        directionRows = [ordered]@{ down = 0; left = 1; right = 2; up = 3 }
    }
    before = [pscustomobject]@{ source = $Before; frames = $beforeMetrics }
    after = [pscustomobject]@{ source = $After; frames = $afterMetrics }
    validation = [pscustomobject]@{
        afterAllEdgesClear = (@($afterMetrics | Where-Object { $_.metrics.edgeAnyAlpha.top -ne 0 -or $_.metrics.edgeAnyAlpha.bottom -ne 0 -or $_.metrics.edgeAnyAlpha.left -ne 0 -or $_.metrics.edgeAnyAlpha.right -ne 0 }).Count -eq 0)
        afterAllFramesNonEmpty = (@($afterMetrics | Where-Object { $_.metrics.opaquePixels -eq 0 }).Count -eq 0)
    }
}
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $OutputRoot 'report.json') -Encoding UTF8
Write-Output ("rendered {0} before and {1} after frames" -f $beforeMetrics.Count, $afterMetrics.Count)
