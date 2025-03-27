import React, { useState, useRef } from "react";
import "./BerserkerBoard.css";

const BOARD_SIZE = 6;

// We’ll place 8 red and 8 white in specific spots so they (hopefully) won't start with 3 in a row.
function createInitialBoard() {
  // Empty 6x6
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );

  // Positions for the 8 red pawns
  //  - Four corners, plus four “inner corners” so they’re spaced out
  const redPositions = [
    [0, 0],
    [0, 5],
    [5, 0],
    [5, 5],
    [1, 1],
    [1, 4],
    [4, 1],
    [4, 4],
  ];

  // Positions for the 8 white pawns
  //  - Also spaced around corners so we (likely) don’t get 3 in a row right away
  const whitePositions = [
    [0, 1],
    [0, 4],
    [1, 0],
    [1, 5],
    [4, 0],
    [4, 5],
    [5, 1],
    [5, 4],
  ];

  redPositions.forEach(([r, c]) => {
    board[r][c] = "red";
  });
  whitePositions.forEach(([r, c]) => {
    board[r][c] = "white";
  });

  return board;
}

// We only push a single occupant if the next cell is free/off-board; 
// if there’s a second pawn behind it, push is blocked.
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
  const [board, setBoard] = useState(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState("red");
  const [winner, setWinner] = useState(null);

  const screamRef = useRef(null);

  // Quick boundary check
  const isValid = (r, c) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

  // Simple 3-in-a-row check
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

  // Only pushes the one occupant at (r,c) if the next cell behind it is free or off-board.
  const canPushOne = (r, c, dr, dc, brd) => {
    if (!isValid(r, c) || brd[r][c] === null) return null;
    const rNext = r + dr;
    const cNext = c + dc;

    // Off-board => occupant falls off
    if (!isValid(rNext, cNext)) {
      return { type: "offBoard", fromR: r, fromC: c };
    }
    // If next cell is empty => occupant moves there
    if (brd[rNext][cNext] === null) {
      return { type: "move", fromR: r, fromC: c, toR: rNext, toC: cNext };
    }
    // Otherwise blocked by another pawn => no push
    return null;
  };

  // Place a new pawn of currentPlayer in an empty cell and do single-pawn pushing
  const handlePlace = (row, col) => {
    if (winner) return;
    if (!isValid(row, col)) return;

    // If it’s already occupied, can’t place
    if (board[row][col] !== null) return;

    const newBoard = board.map((rArr) => [...rArr]);
    newBoard[row][col] = currentPlayer;

    if (screamRef.current) {
      screamRef.current.currentTime = 0;
      screamRef.current.play();
    }

    // Attempt to push each occupant next to the newly placed piece
    directions.forEach(([dr, dc]) => {
      const adjR = row + dr;
      const adjC = col + dc;
      if (isValid(adjR, adjC) && newBoard[adjR][adjC] !== null) {
        const pushAction = canPushOne(adjR, adjC, dr, dc, newBoard);
        if (pushAction) {
          if (pushAction.type === "offBoard") {
            newBoard[pushAction.fromR][pushAction.fromC] = null;
          } else if (pushAction.type === "move") {
            const occupant = newBoard[pushAction.fromR][pushAction.fromC];
            newBoard[pushAction.toR][pushAction.toC] = occupant;
            newBoard[pushAction.fromR][pushAction.fromC] = null;
          }
        }
      }
    });

    // Check for a winner
    const maybeWinner = checkWin(newBoard);
    if (maybeWinner) {
      setWinner(maybeWinner);
    }

    setBoard(newBoard);
    setCurrentPlayer((p) => (p === "red" ? "white" : "red"));
  };

  // Reset to the original arrangement (8 red + 8 white) and clear winner
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
            // The cell is empty or has "red"/"white"
            const isOccupied = cell !== null;
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="berserker-cell"
                onClick={() => handlePlace(rowIndex, colIndex)}
              >
                {/* If this cell has a pawn, show its sprite as an <img> */}
                {isOccupied && (
                  <img
                    className={`pawn-sprite ${cell}-sprite`}
                    src={cell === "red" ? "/red-pawn.gif" : "/white-pawn.gif"}
                    alt={cell === "red" ? "Red Pawn" : "White Pawn"}
                  />
                )}
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
