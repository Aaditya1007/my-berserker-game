import React, { useState, useRef } from "react";
import "./BerserkerBoard.css";

const BOARD_SIZE = 6;
const INITIAL_BERSERKERS = 8;

function createEmptyBoard() {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
}

// Directions to check for pushing
const directions = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

export default function BerserkerGame() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState("red"); 
  const [berserkers, setBerserkers] = useState({ red: INITIAL_BERSERKERS, white: INITIAL_BERSERKERS });
  const [winner, setWinner] = useState(null);

  const screamRef = useRef(null);

  // Basic validity check
  const isValid = (r, c) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

  // Check if we have 3 in a row anywhere
  const checkWin = (brd) => {
    function checkLine(r, c, dr, dc, color) {
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
        if (color && (
          checkLine(r, c, 1, 0, color) ||
          checkLine(r, c, 0, 1, color) ||
          checkLine(r, c, 1, 1, color) ||
          checkLine(r, c, 1, -1, color)
        )) {
          return color;
        }
      }
    }
    return null;
  };

  /**
   * This revised function checks if exactly ONE piece can be pushed from (r, c).
   * If the next cell in direction (dr, dc) is:
   *   - Off-board => we can push it off
   *   - Empty => we can push it there
   *   - Occupied => blocked (return null)
   * 
   * If we can push, return an object describing the push action.
   * Otherwise, return null to signal "no push."
   */
  const canPushOne = (r, c, dr, dc, brd) => {
    // First, if out of bounds or there’s no pawn here, no push
    if (!isValid(r, c) || brd[r][c] === null) {
      return null;
    }

    // The space behind it
    const rNext = r + dr;
    const cNext = c + dc;

    // If that behind cell is off-board => can push piece off
    if (!isValid(rNext, cNext)) {
      return { type: "offBoard", fromR: r, fromC: c };
    }

    // If that behind cell is empty => can push piece there
    if (brd[rNext][cNext] === null) {
      return { type: "move", fromR: r, fromC: c, toR: rNext, toC: cNext };
    }

    // Otherwise, it's occupied => blocked
    return null;
  };

  // Main place logic with single-pawn push checks
  const handlePlace = (row, col) => {
    if (winner) return; 
    if (!isValid(row, col)) return;

    // If cell is occupied or no stash left, can't place
    if (board[row][col] !== null || berserkers[currentPlayer] <= 0) return;

    // Copy board
    const newBoard = board.map(rowArr => [...rowArr]);
    // Place the new piece
    newBoard[row][col] = currentPlayer;

    // Optional scream
    if (screamRef.current) {
      screamRef.current.currentTime = 0;
      screamRef.current.play();
    }

    // Try to push each adjacent cell in the 8 directions
    directions.forEach(([dr, dc]) => {
      const adjR = row + dr;
      const adjC = col + dc;

      if (isValid(adjR, adjC) && newBoard[adjR][adjC] !== null) {
        // Check if we can push exactly 1 occupant
        const pushAction = canPushOne(adjR, adjC, dr, dc, newBoard);
        if (pushAction) {
          if (pushAction.type === "offBoard") {
            // Remove occupant from board, return to stash
            const pushedColor = newBoard[pushAction.fromR][pushAction.fromC];
            newBoard[pushAction.fromR][pushAction.fromC] = null;
            // Return that piece to stash
            setBerserkers(prev => ({
              ...prev,
              [pushedColor]: prev[pushedColor] + 1
            }));
          } else if (pushAction.type === "move") {
            // Move occupant into the empty cell
            const occupant = newBoard[pushAction.fromR][pushAction.fromC];
            newBoard[pushAction.toR][pushAction.toC] = occupant;
            newBoard[pushAction.fromR][pushAction.fromC] = null;
          }
        }
        // If pushAction is null => there's a contiguous pawn blocking, so no movement.
      }
    });

    // Deduct from stash
    setBerserkers(prev => ({
      ...prev,
      [currentPlayer]: prev[currentPlayer] - 1
    }));

    // Check for winner
    const maybeWinner = checkWin(newBoard);
    if (maybeWinner) {
      setWinner(maybeWinner);
    }

    // Commit changes
    setBoard(newBoard);
    // Switch players
    setCurrentPlayer(p => (p === "red" ? "white" : "red"));
  };

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setBerserkers({ red: INITIAL_BERSERKERS, white: INITIAL_BERSERKERS });
    setCurrentPlayer("red");
    setWinner(null);
  };

  return (
    <div className="game-container">
      <div className="status-panel">
        <div>
          Current Player:{" "}
          <span className={currentPlayer === "red" ? "red-text" : "white-text"}>
            {currentPlayer}
          </span>
        </div>
        <div>
          Berserkers left — Red: {berserkers.red}, White: {berserkers.white}
        </div>
        {winner && (
          <div className="winner-text">
            {winner.toUpperCase()} WINS!
          </div>
        )}
      </div>

      <div className="berserker-board">
        {board.map((rowArr, rowIdx) =>
          rowArr.map((cell, colIdx) => {
            let cellClass = "berserker-cell";
            if (cell === "red") cellClass += " red";
            else if (cell === "white") cellClass += " white";

            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={cellClass}
                onClick={() => handlePlace(rowIdx, colIdx)}
              >
                {/* Optionally show "R" or "W" or an icon */}
                {cell === "red" ? "R" : cell === "white" ? "W" : " "}
              </div>
            );
          })
        )}
      </div>

      <button className="reset-button" onClick={resetGame}>
        Reset Game
      </button>

      <audio ref={screamRef} src="/berserker-scream.mp3" preload="auto" />
    </div>
  );
}
