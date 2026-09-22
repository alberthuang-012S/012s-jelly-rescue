param(
    [string]$Source = (Join-Path $PSScriptRoot '..\..\reference\jelly-anthropomorphic-player-walk.png'),
    [string]$Output = (Join-Path $PSScriptRoot '..\..\reference\runtime\jelly-anthropomorphic-player-walk-v3.png')
)

Add-Type -AssemblyName System.Drawing

$sourceCellWidth = 374
$sourceCellHeight = 352
$logicalCellWidth = 374
$logicalCellHeight = 372
$outputCellWidth = 420
$outputCellHeight = 400
$columns = 3
$rows = 4
$directions = @('down', 'left', 'right', 'up')
$alphaThreshold = 8
$artScale = 1.06
$destinationWidth = [int][Math]::Round($logicalCellWidth * $artScale)
$destinationHeight = [int][Math]::Round($logicalCellHeight * $artScale)
$groundBaseline = 392

function Get-AlphaBounds {
    param([System.Drawing.Bitmap]$Bitmap)
    $minX = $Bitmap.Width
    $minY = $Bitmap.Height
    $maxX = -1
    $maxY = -1
    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
        for ($x = 0; $x -lt $Bitmap.Width; $x++) {
            if ($Bitmap.GetPixel($x, $y).A -gt $alphaThreshold) {
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    [pscustomobject]@{ MinX = $minX; MinY = $minY; MaxX = $maxX; MaxY = $maxY }
}

function Clear-Rectangle {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height
    )
    $graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Transparent)
    $graphics.FillRectangle($brush, [System.Drawing.Rectangle]::new($X, $Y, $Width, $Height))
    $brush.Dispose()
    $graphics.Dispose()
}

function Copy-SourceCell {
    param(
        [System.Drawing.Bitmap]$SourceBitmap,
        [System.Drawing.Bitmap]$DestinationBitmap,
        [int]$SourceX,
        [int]$SourceY,
        [int]$DestinationY
    )
    $rawFrame = $SourceBitmap.Clone(
        [System.Drawing.Rectangle]::new($SourceX, $SourceY, $sourceCellWidth, $sourceCellHeight),
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($DestinationBitmap)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.DrawImageUnscaled($rawFrame, 0, $DestinationY)
    $graphics.Dispose()
    $rawFrame.Dispose()
}

function Copy-Artifact {
    param(
        [System.Drawing.Bitmap]$SourceBitmap,
        [System.Drawing.Bitmap]$DestinationBitmap,
        [int]$SourceX,
        [int]$SourceY,
        [int]$DestinationX,
        [int]$DestinationY,
        [int]$Width,
        [int]$Height
    )
    $artifact = $SourceBitmap.Clone(
        [System.Drawing.Rectangle]::new($SourceX, $SourceY, $Width, $Height),
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($DestinationBitmap)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.DrawImageUnscaled($artifact, $DestinationX, $DestinationY)
    $graphics.Dispose()
    $artifact.Dispose()
}

$sourceBitmap = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Source).Path)
$outputBitmap = New-Object System.Drawing.Bitmap(
    ($outputCellWidth * $columns),
    ($outputCellHeight * $rows),
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$outputGraphics = [System.Drawing.Graphics]::FromImage($outputBitmap)
$outputGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$outputGraphics.Clear([System.Drawing.Color]::Transparent)
$outputGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$outputGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$outputGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$outputGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# These pieces were inspected in the original atlas. The top pieces in LEFT
# are the continuation of the DOWN shoes. The bottom pieces in RIGHT align with
# the top of the corresponding UP headwear. They are copied first and only then
# cleared from their old row; no unverified connected component is deleted.
$downOverflow = @(
    [pscustomobject]@{ column = 0; x = 192; y = 4; width = 46; height = 17 },
    [pscustomobject]@{ column = 1; x = 168; y = 4; width = 46; height = 16 },
    [pscustomobject]@{ column = 2; x = 140; y = 4; width = 55; height = 19 }
)
$upOverflow = @(
    [pscustomobject]@{ column = 0; x = 189; y = 341; width = 39; height = 7 },
    [pscustomobject]@{ column = 1; x = 169; y = 343; width = 33; height = 5 },
    [pscustomobject]@{ column = 2; x = 148; y = 342; width = 34; height = 6 }
)

$frameBitmaps = @{}
for ($row = 0; $row -lt $rows; $row++) {
    for ($column = 0; $column -lt $columns; $column++) {
        $direction = $directions[$row]
        $frameBitmap = New-Object System.Drawing.Bitmap(
            $logicalCellWidth,
            $logicalCellHeight,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        )
        $frameGraphics = [System.Drawing.Graphics]::FromImage($frameBitmap)
        $frameGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $frameGraphics.Clear([System.Drawing.Color]::Transparent)
        $frameGraphics.Dispose()

        if ($direction -eq 'down') {
            Copy-SourceCell $sourceBitmap $frameBitmap ($column * $sourceCellWidth) 0 4
        } elseif ($direction -eq 'left' -or $direction -eq 'right') {
            Copy-SourceCell $sourceBitmap $frameBitmap ($column * $sourceCellWidth) ($row * $sourceCellHeight) 21
        } else {
            # The main UP cell is lowered so the recovered top-of-head pixels
            # can sit above it while retaining transparent headroom.
            Copy-SourceCell $sourceBitmap $frameBitmap ($column * $sourceCellWidth) ($row * $sourceCellHeight) 33
        }

        $frameBitmaps["$row-$column"] = $frameBitmap
    }
}

# Reunite DOWN's shoe continuations before removing them from LEFT.
foreach ($artifact in $downOverflow) {
    $sourceX = ($artifact.column * $sourceCellWidth) + $artifact.x
    Copy-Artifact $sourceBitmap $frameBitmaps["0-$($artifact.column)"] $sourceX $artifact.y $artifact.x 352 $artifact.width $artifact.height
    Clear-Rectangle $frameBitmaps["1-$($artifact.column)"] $artifact.x (21 + $artifact.y) $artifact.width $artifact.height
    Write-Output ("reunited DOWN frame {0} from LEFT source {1},{2},{3},{4}" -f $artifact.column, $sourceX, $artifact.y, $artifact.width, $artifact.height)
}

# Reunite UP's headwear continuation before removing it from RIGHT.
foreach ($artifact in $upOverflow) {
    $sourceX = ($artifact.column * $sourceCellWidth) + $artifact.x
    $targetY = 33 + 4 - $artifact.height
    Copy-Artifact $sourceBitmap $frameBitmaps["3-$($artifact.column)"] $sourceX $artifact.y $artifact.x $targetY $artifact.width $artifact.height
    Clear-Rectangle $frameBitmaps["2-$($artifact.column)"] $artifact.x (21 + $artifact.y) $artifact.width $artifact.height
    Write-Output ("reunited UP frame {0} from RIGHT source {1},{2},{3},{4} targetY={5}" -f $artifact.column, $sourceX, $artifact.y, $artifact.width, $artifact.height, $targetY)
}

for ($row = 0; $row -lt $rows; $row++) {
    for ($column = 0; $column -lt $columns; $column++) {
        $frameBitmap = $frameBitmaps["$row-$column"]
        $bounds = Get-AlphaBounds $frameBitmap
        if ($bounds.MaxX -lt 0) { throw "Frame $($directions[$row]) $column is empty." }
        $contentBottom = $bounds.MaxY + 1
        $destinationX = ($column * $outputCellWidth) + [int][Math]::Round(($outputCellWidth - $destinationWidth) / 2)
        $destinationY = ($row * $outputCellHeight) + $groundBaseline - [int][Math]::Round($contentBottom * $artScale)
        $destinationRectangle = [System.Drawing.Rectangle]::new($destinationX, $destinationY, $destinationWidth, $destinationHeight)
        $outputGraphics.DrawImage($frameBitmap, $destinationRectangle, 0, 0, $logicalCellWidth, $logicalCellHeight, [System.Drawing.GraphicsUnit]::Pixel)
        Write-Output ("{0} frame {1} bounds={2},{3},{4},{5} destination={6},{7},{8},{9}" -f `
            $directions[$row], $column, $bounds.MinX, $bounds.MinY, $bounds.MaxX, $bounds.MaxY,
            $destinationX, $destinationY, $destinationWidth, $destinationHeight)
        $frameBitmap.Dispose()
    }
}
$outputGraphics.Dispose()

# Keep the verified enlarged safety canvas, but guarantee exact transparent
# borders after bicubic scaling so adjacent cells cannot be sampled.
$transparent = [System.Drawing.Color]::Transparent
for ($row = 0; $row -lt $rows; $row++) {
    for ($column = 0; $column -lt $columns; $column++) {
        $x0 = $column * $outputCellWidth
        $y0 = $row * $outputCellHeight
        for ($x = 0; $x -lt $outputCellWidth; $x++) {
            $outputBitmap.SetPixel($x0 + $x, $y0, $transparent)
            $outputBitmap.SetPixel($x0 + $x, $y0 + $outputCellHeight - 1, $transparent)
        }
        for ($y = 1; $y -lt ($outputCellHeight - 1); $y++) {
            $outputBitmap.SetPixel($x0, $y0 + $y, $transparent)
            $outputBitmap.SetPixel($x0 + $outputCellWidth - 1, $y0 + $y, $transparent)
        }
    }
}

$outputPath = [System.IO.Path]::GetFullPath($Output)
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputPath) | Out-Null
$outputBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$outputBitmap.Dispose()
$sourceBitmap.Dispose()
Write-Output ("wrote {0}x{1} to {2}" -f ($outputCellWidth * $columns), ($outputCellHeight * $rows), $outputPath)
