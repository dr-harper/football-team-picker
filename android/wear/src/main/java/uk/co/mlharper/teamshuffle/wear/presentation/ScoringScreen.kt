package uk.co.mlharper.teamshuffle.wear.presentation

import android.view.HapticFeedbackConstants
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Text
import kotlinx.coroutines.delay
import uk.co.mlharper.teamshuffle.wear.R
import uk.co.mlharper.teamshuffle.wear.data.ActiveGame

@Composable
fun ScoringScreen(
    game: ActiveGame,
    onGoalScored: (team: Int, scorerName: String?) -> Unit,
    onUndoGoal: (team: Int) -> Unit,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onEndGame: () -> Unit,
    onVoiceNote: () -> Unit,
) {
    var showPlayerPicker by remember { mutableStateOf<Int?>(null) }

    if (showPlayerPicker != null) {
        val team = showPlayerPicker!!
        PlayerPickerScreen(
            teamName = if (team == 1) game.team1Name else game.team2Name,
            players = if (team == 1) game.team1Players else game.team2Players,
            colour = parseColour(if (team == 1) game.team1Colour else game.team2Colour),
            onPlayerSelected = { name ->
                onGoalScored(team, name)
                showPlayerPicker = null
            },
            onDismiss = { showPlayerPicker = null },
        )
    } else {
        MainScoreScreen(
            game = game,
            onScoreTap = { team -> showPlayerPicker = team },
            onUndoGoal = onUndoGoal,
            onPause = onPause,
            onResume = onResume,
            onEndGame = onEndGame,
            onVoiceNote = onVoiceNote,
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MainScoreScreen(
    game: ActiveGame,
    onScoreTap: (team: Int) -> Unit,
    onUndoGoal: (team: Int) -> Unit,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onEndGame: () -> Unit,
    onVoiceNote: () -> Unit,
) {
    val pagerState = rememberPagerState(pageCount = { 2 })

    VerticalPager(
        state = pagerState,
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
    ) { page ->
        when (page) {
            0 -> ScorePage(
                game = game,
                onScoreTap = onScoreTap,
                onUndoGoal = onUndoGoal,
                onVoiceNote = onVoiceNote,
                showPageHint = true,
            )
            1 -> MatchControlsPage(
                game = game,
                onPause = onPause,
                onResume = onResume,
                onEndGame = onEndGame,
                onVoiceNote = onVoiceNote,
            )
        }
    }
}

/**
 * Reusable composable that calculates elapsed match minutes,
 * accounting for paused state and total paused duration.
 */
@Composable
private fun rememberElapsedMinutes(game: ActiveGame): Int {
    var elapsedMs by remember { mutableLongStateOf(0L) }
    LaunchedEffect(game.startedAt, game.paused, game.pausedAt, game.totalPausedMs) {
        if (game.paused) {
            elapsedMs = game.pausedAt - game.startedAt - game.totalPausedMs
        } else {
            while (true) {
                elapsedMs = System.currentTimeMillis() - game.startedAt - game.totalPausedMs
                delay(1_000L)
            }
        }
    }
    return (elapsedMs / 60_000).toInt()
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ScorePage(
    game: ActiveGame,
    onScoreTap: (team: Int) -> Unit,
    onUndoGoal: (team: Int) -> Unit,
    onVoiceNote: () -> Unit,
    showPageHint: Boolean,
) {
    val team1Colour = parseColour(game.team1Colour)
    val team2Colour = parseColour(game.team2Colour)
    val view = LocalView.current
    val elapsedMin = rememberElapsedMinutes(game)

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp, vertical = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            // Mic button (replaces game title)
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF1E3A5F))
                    .clickable {
                        view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                        onVoiceNote()
                    },
                contentAlignment = Alignment.Center,
            ) {
                Text("\uD83C\uDF99", fontSize = 12.sp)
            }

            // Team names
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                Text(
                    text = game.team1Name,
                    color = team1Colour,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = game.team2Name,
                    color = team2Colour,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
            }

            // Large tappable scores
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .then(
                            if (!game.paused) Modifier.combinedClickable(
                                onClick = {
                                    view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                                    onScoreTap(1)
                                },
                                onLongClick = {
                                    if (game.score1 > 0) {
                                        view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                                        onUndoGoal(1)
                                    }
                                },
                            ) else Modifier
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "${game.score1}",
                        color = if (game.paused) Color(0xFF6B7280) else Color.White,
                        fontSize = 48.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Text("–", color = Color(0xFF6B7280), fontSize = 28.sp)
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .then(
                            if (!game.paused) Modifier.combinedClickable(
                                onClick = {
                                    view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                                    onScoreTap(2)
                                },
                                onLongClick = {
                                    if (game.score2 > 0) {
                                        view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                                        onUndoGoal(2)
                                    }
                                },
                            ) else Modifier
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "${game.score2}",
                        color = if (game.paused) Color(0xFF6B7280) else Color.White,
                        fontSize = 48.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            Text(
                text = if (game.paused) "Paused — swipe down" else "Tap +goal · Hold -goal",
                color = if (game.paused) Color(0xFFEAB308) else Color(0xFF6B7280),
                fontSize = 10.sp,
                textAlign = TextAlign.Center,
            )

            // Timer + status badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("${elapsedMin}'", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                Spacer(modifier = Modifier.width(6.dp))
                if (game.paused) {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFEAB308), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text("PAUSED", color = Color.Black, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFF22C55E), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text("LIVE", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Down arrow hint at bottom
        if (showPageHint) {
            Text(
                text = "▾",
                color = Color(0xFF4B5563),
                fontSize = 18.sp,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 4.dp),
            )
        }

    }
}

@Composable
private fun MatchControlsPage(
    game: ActiveGame,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onEndGame: () -> Unit,
    onVoiceNote: () -> Unit,
) {
    val view = LocalView.current
    var confirmEnd by remember { mutableStateOf(false) }
    val elapsedMin = rememberElapsedMinutes(game)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        if (confirmEnd) {
            // End match confirmation
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    text = "End this match?",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(bottom = 12.dp),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFDC2626))
                            .clickable {
                                view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                                onEndGame()
                            }
                            .padding(horizontal = 20.dp, vertical = 10.dp),
                    ) {
                        Text("Yes", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF374151))
                            .clickable { confirmEnd = false }
                            .padding(horizontal = 20.dp, vertical = 10.dp),
                    ) {
                        Text("No", color = Color.White, fontSize = 14.sp)
                    }
                }
            }
        } else {
            // Normal controls: timer, pause/resume, end game
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.padding(horizontal = 20.dp),
            ) {
                // Timer + status badge
                Text(
                    text = "${elapsedMin}'",
                    color = Color(0xFF9CA3AF),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                )
                Spacer(modifier = Modifier.height(4.dp))
                if (game.paused) {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFEAB308), RoundedCornerShape(4.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                    ) {
                        Text("PAUSED", color = Color.Black, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFF22C55E), RoundedCornerShape(4.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                    ) {
                        Text("LIVE", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Pause/resume button
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (game.paused) Color(0xFF166534) else Color(0xFF854D0E))
                        .clickable {
                            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                            if (game.paused) onResume() else onPause()
                        }
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = if (game.paused) "▶  Resume" else "⏸  Pause",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Voice note button
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF1E3A5F))
                        .clickable {
                            view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                            onVoiceNote()
                        }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "\uD83C\uDF99  Voice Note",
                        color = Color(0xFF93C5FD),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // End game button
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF7F1D1D))
                        .clickable {
                            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                            confirmEnd = true
                        }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "End Game",
                        color = Color(0xFFFCA5A5),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

/**
 * Fast player picker using plain LazyColumn.
 */
@Composable
private fun PlayerPickerScreen(
    teamName: String,
    players: List<String>,
    colour: Color,
    onPlayerSelected: (String?) -> Unit,
    onDismiss: () -> Unit,
) {
    val view = LocalView.current

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(horizontal = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        item {
            Spacer(modifier = Modifier.height(32.dp))
            Text(
                text = "Goal: $teamName",
                color = colour,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        items(players, key = { it }) { player ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 3.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(colour.copy(alpha = 0.15f))
                    .clickable {
                        view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                        onPlayerSelected(player)
                    }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Text(
                    text = player,
                    color = Color.White,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(4.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 3.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFF1F2937))
                    .clickable { onPlayerSelected(null) }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Text("Unknown scorer", color = Color(0xFF9CA3AF), fontSize = 13.sp)
            }
        }

        item {
            Spacer(modifier = Modifier.height(4.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 3.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFF1F2937))
                    .clickable { onDismiss() }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text("Cancel", color = Color(0xFFEF4444), fontSize = 13.sp)
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun PreMatchScreen(
    game: ActiveGame,
    onStartMatch: () -> Unit,
) {
    val team1Colour = parseColour(game.team1Colour)
    val team2Colour = parseColour(game.team2Colour)
    val view = LocalView.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(20.dp),
        ) {
            // Game title
            Text(
                text = game.title.ifEmpty { "Match" },
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Team names
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                Text(
                    text = game.team1Name,
                    color = team1Colour,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "vs",
                    color = Color(0xFF6B7280),
                    fontSize = 12.sp,
                )
                Text(
                    text = game.team2Name,
                    color = team2Colour,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(modifier = Modifier.height(16.dp))

            // Start Match button
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color(0xFF22C55E))
                    .clickable {
                        view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                        onStartMatch()
                    }
                    .padding(horizontal = 28.dp, vertical = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "Start Match",
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

@Composable
fun WaitingScreen(displayName: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(24.dp),
        ) {
            Image(
                painter = painterResource(id = R.drawable.ic_logo),
                contentDescription = "TeamShuffle",
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape),
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = if (displayName.isNotEmpty()) "Hi $displayName" else "TeamShuffle",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Start a game from\nyour phone to score",
                color = Color(0xFF9CA3AF),
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
                lineHeight = 15.sp,
            )
        }
    }
}

@Composable
fun FullTimeScreen(
    game: ActiveGame,
    onDismiss: () -> Unit,
) {
    val team1Colour = parseColour(game.team1Colour)
    val team2Colour = parseColour(game.team2Colour)

    // Auto-dismiss after 4 seconds
    LaunchedEffect(Unit) {
        delay(4_000L)
        onDismiss()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .clickable { onDismiss() },
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(20.dp),
        ) {
            Text(
                text = "Full Time",
                color = Color(0xFF9CA3AF),
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Team names
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                Text(
                    text = game.team1Name,
                    color = team1Colour,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = game.team2Name,
                    color = team2Colour,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(modifier = Modifier.height(4.dp))

            // Final score
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "${game.score1}",
                    color = Color.White,
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                )
                Text("–", color = Color(0xFF6B7280), fontSize = 28.sp)
                Text(
                    text = "${game.score2}",
                    color = Color.White,
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Tap to dismiss",
                color = Color(0xFF4B5563),
                fontSize = 10.sp,
            )
        }
    }
}

private fun parseColour(hex: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (_: Exception) {
        Color(0xFF22C55E)
    }
}
