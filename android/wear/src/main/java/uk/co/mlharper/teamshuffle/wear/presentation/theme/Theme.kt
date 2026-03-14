package uk.co.mlharper.teamshuffle.wear.presentation.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Colors

private val WearColors = Colors(
    primary = Color(0xFF22C55E),       // Green accent
    primaryVariant = Color(0xFF16A34A),
    secondary = Color(0xFF3B82F6),     // Blue accent
    secondaryVariant = Color(0xFF2563EB),
    background = Color.Black,
    surface = Color(0xFF1A1A1A),
    error = Color(0xFFEF4444),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = Color.White,
    onSurface = Color.White,
    onSurfaceVariant = Color(0xFF9CA3AF),
    onError = Color.White,
)

@Composable
fun TeamShuffleWearTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colors = WearColors,
        content = content,
    )
}
