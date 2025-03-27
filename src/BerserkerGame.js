import React, { useState, useRef } from "react";
import "./BerserkerBoard.css";

const BOARD_SIZE = 6;

// We no longer have a stash, since you want 16 pawns on the board from the start
// Let's define how many total pawns of each color:
const TOTAL_PAWNS_PER_COLOR = 8; // 8 red + 8 white = 16 total

// This creates a 6x6 board with 8 red and 8 white around the edges
function createInitialBoard() {
  // Make an empty 6x6 grid
  const board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  // A quick sequence of perimeter cells (row,col) around the edge
  // We'll grab the first 16 positions for 16 pawns total
  let perimeterPositions = [
    [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], // top row
    [1, 5], [2, 5], [3, 5], [4, 5], [5, 5],        // right column
    [5, 4], [5, 3], [5, 2], [5, 1], [5, 0],        // bottom row
    [4, 0], [3, 0], [2, 0], [1, 0],                // left column
  ];

  // We only need 16 squares for 16 pawns (8 red + 8 white)
  perimeterPositions = perimeterPositions.slice(0, 16);

  // Fill the first 8 with red, the next 8 with white
  for (let i = 0; i < 8; i++) {
    const [r, c] = perimeterPositions[i];
    board[r][c] = "red";
  }
  for (let i = 8; i < 16; i++) {
    const [r, c] = perimeterPositions[i];
    board[r][c] = "white";
  }

  return board;
}

// Directions to try pushing in: up/down/left/right + diagonals
const directions = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

export default function BerserkerGame() {
  const [board, setBoard] = useState(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState("red");
  const [winner, setWinner] = useState(null);
  const screamRef = useRef(null);

  // Validate row,col
  const isValid = (r, c) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

  // 3-in-a-row check
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

  /**
   * If there's exactly ONE piece at (r,c), check if it can be pushed:
   * - If the next cell behind it is off-board => we push it off
   * - If the next cell behind it is empty => we move it there
   * - If that cell is occupied => blocked => no push
   */
  const canPushOne = (r, c, dr, dc, brd) => {
    if (!isValid(r, c) || brd[r][c] === null) return null;
    const rNext = r + dr;
    const cNext = c + dc;

    // Off-board => push occupant off
    if (!isValid(rNext, cNext)) {
      return { type: "offBoard", fromR: r, fromC: c };
    }
    // Empty => push occupant to that cell
    if (brd[rNext][cNext] === null) {
      return { type: "move", fromR: r, fromC: c, toR: rNext, toC: cNext };
    }
    // Otherwise blocked
    return null;
  };

  // Place a new piece at row,col
  // We assume there's no "stash" concept now, so the currentPlayer can place infinitely
  // Or you can limit how many total pieces each color can place if desired
  const handlePlace = (row, col) => {
    if (winner) return;
    if (!isValid(row, col)) return;

    // If cell is occupied, can't place
    if (board[row][col] !== null) return;

    // Copy board
    const newBoard = board.map((rArr) => [...rArr]);
    // Place the new piece
    newBoard[row][col] = currentPlayer;

    // Optional scream
    if (screamRef.current) {
      screamRef.current.currentTime = 0;
      screamRef.current.play();
    }

    // Attempt single-pawn pushes in all directions around (row,col)
    directions.forEach(([dr, dc]) => {
      const adjR = row + dr;
      const adjC = col + dc;
      if (isValid(adjR, adjC) && newBoard[adjR][adjC] !== null) {
        const pushAction = canPushOne(adjR, adjC, dr, dc, newBoard);
        if (pushAction) {
          if (pushAction.type === "offBoard") {
            // The occupant at fromR,fromC falls off the board
            newBoard[pushAction.fromR][pushAction.fromC] = null;
          } else if (pushAction.type === "move") {
            // Move occupant to the behind cell
            const occupant = newBoard[pushAction.fromR][pushAction.fromC];
            newBoard[pushAction.toR][pushAction.toC] = occupant;
            newBoard[pushAction.fromR][pushAction.fromC] = null;
          }
        }
      }
    });

    // Check for winner
    const maybeWinner = checkWin(newBoard);
    if (maybeWinner) setWinner(maybeWinner);

    setBoard(newBoard);

    // Switch players
    setCurrentPlayer((p) => (p === "red" ? "white" : "red"));
  };

  // Reset everything
  const resetGame = () => {
    setBoard(createInitialBoard());
    setWinner(null);
    setCurrentPlayer("red");
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
        {winner && (
          <div className="winner-text">
            {winner.toUpperCase()} WINS!
          </div>
        )}
      </div>

      {/* The 6x6 board */}
      <div className="berserker-board">
        {board.map((rowArr, rowIndex) =>
          rowArr.map((cell, colIndex) => {
            let cellClass = "berserker-cell";
            // We'll add a separate class for each color to handle the sprite
            if (cell === "red") cellClass += " red-pawn";
            else if (cell === "white") cellClass += " white-pawn";

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cellClass}
                onClick={() => handlePlace(rowIndex, colIndex)}
              >
                {/* cell is empty => no content, otherwise the sprite is shown via CSS background */}
              </div>
            );
          })
        )}
      </div>

      <button className="reset-button" onClick={resetGame}>Reset Game</button>

      <audio ref={screamRef} src="/berserker-scream.mp3" preload="auto" />
    </div>
  );
}
