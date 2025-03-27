import React, { useState, useRef } from "react";
import "./BerserkerBoard.css"; // <-- Custom CSS file you'll create

const BOARD_SIZE = 6;
const INITIAL_BERSERKERS = 8;

/** Creates a 6x6 board filled with null (empty). */
function createEmptyBoard() {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
}

// All possible directions for pushing: up, down, left, right + diagonals
const directions = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export default function BerserkerGame() {
  // Our core states
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState("red"); // "red" or "white"
  const [berserkers, setBerserkers] = useState({ red: INITIAL_BERSERKERS, white: INITIAL_BERSERKERS });
  const [winner, setWinner] = useState(null);
  const screamRef = useRef(null);

  // Check that row/col is on the board
  const isValid = (r, c) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

  // If a player lines up 3 in a row, they win
  const checkWin = (brd) => {
    function checkLine(r, c, dr, dc, color) {
      // Look three cells in a certain direction (dr, dc)
      for (let i = 0; i < 3; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (!isValid(nr, nc) || brd[nr][nc] !== color) return false;
      }
      return true;
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const color = brd[r][c];
        if (
          color &&
          (checkLine(r, c, 1, 0, color) ||
            checkLine(r, c, 0, 1, color) ||
            checkLine(r, c, 1, 1, color) ||
            checkLine(r, c, 1, -1, color))
        ) {
          return color;
        }
      }
    }
    return null;
  };

  // Figures out whether a chain of pieces can be pushed in direction (dr, dc).
  // Returns the chain if pushable, or null if blocked.
  const canPush = (r, c, dr, dc, brd) => {
    const positions = [];
    while (isValid(r, c) && brd[r][c] !== null) {
      positions.push([r, c]);
      r += dr;
      c += dc;
    }
    // If we’ve gone off-board or we found a non-empty cell, we can’t push
    if (!isValid(r, c) || brd[r][c] !== null) return null;
    return positions;
  };

  // Place a piece at row/col, possibly pushing pieces
  const handlePlace = (row, col) => {
    if (winner) return; // If game’s over, ignore
    if (!isValid(row, col)) return;

    // If the cell’s already occupied or you have no more berserkers to place
    if (board[row][col] !== null || berserkers[currentPlayer] <= 0) return;

    // Make a copy
    const newBoard = board.map((r) => [...r]);

    // Place the current player's piece
    newBoard[row][col] = currentPlayer;

    // Play the scream effect when placing
    if (screamRef.current) {
      screamRef.current.currentTime = 0; // optional: reset to start
      screamRef.current.play();
    }

    // Attempt to push in all directions around this new piece
    directions.forEach(([dr, dc]) => {
      const adjR = row + dr;
      const adjC = col + dc;

      if (isValid(adjR, adjC) && newBoard[adjR][adjC] !== null) {
        const chain = canPush(adjR, adjC, dr, dc, newBoard);
        if (chain) {
          // Push them forward in reverse order so we don't overwrite
          for (let i = chain.length - 1; i >= 0; i--) {
            const [fromR, fromC] = chain[i];
            const toR = fromR + dr;
            const toC = fromC + dc;
            newBoard[toR][toC] = newBoard[fromR][fromC];
            newBoard[fromR][fromC] = null;
          }
        } else {
          // If we can’t push because the chain goes off-board, that piece “falls off”
          if (!isValid(adjR + dr, adjC + dc)) {
            const pushedColor = newBoard[adjR][adjC];
            newBoard[adjR][adjC] = null;
            // Return that piece to the stash
            setBerserkers((prev) => ({
              ...prev,
              [pushedColor]: prev[pushedColor] + 1,
            }));
          }
        }
      }
    });

    // Decrement the stash
    setBerserkers((prev) => ({
      ...prev,
      [currentPlayer]: prev[currentPlayer] - 1,
    }));

    // Check for a winner
    const maybeWinner = checkWin(newBoard);
    if (maybeWinner) {
      setWinner(maybeWinner);
    }

    // Update the board
    setBoard(newBoard);

    // Switch players
    setCurrentPlayer((p) => (p === "red" ? "white" : "red"));
  };

  // Reset the game
  const resetGame = () => {
    setBoard(createEmptyBoard());
    setBerserkers({ red: INITIAL_BERSERKERS, white: INITIAL_BERSERKERS });
    setCurrentPlayer("red");
    setWinner(null);
  };

  return (
    <div>
      {/* If you want to show the stash info: */}
      <div className="status-panel">
        <div>
          Current Player: <span className={currentPlayer === "red" ? "red-text" : "white-text"}>{currentPlayer}</span>
        </div>
        <div>Berserkers left — Red: {berserkers.red}, White: {berserkers.white}</div>
        {winner && <div className="winner-text">{winner.toUpperCase()} WINS!</div>}
      </div>

      {/* The actual 6x6 board */}
      <div className="berserker-board">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            let cellClass = "berserker-cell";
            if (cell === "red") cellClass += " red";
            else if (cell === "white") cellClass += " white";

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cellClass}
                onClick={() => handlePlace(rowIndex, colIndex)}
              >
                {cell ? (cell === "red" ? "R" : "W") : " "}
              </div>
            );
          })
        )}
      </div>

      {/* Reset button */}
      <button className="reset-button" onClick={resetGame}>
        Reset Game
      </button>

      {/* Scream audio */}
      <audio ref={screamRef} src="/berserker-scream.mp3" preload="auto" />
    </div>
  );
}
