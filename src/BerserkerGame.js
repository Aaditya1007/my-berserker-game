import React from 'react';
import { useRef, useState } from "react";

const BOARD_SIZE = 6;
const INITIAL_BERSERKERS = 8;

const createEmptyBoard = () =>
  Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

const directions = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

export default function BerserkerGame() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState("red");
  const [berserkers, setBerserkers] = useState({ red: 8, white: 8 });
  const [stash, setStash] = useState({ red: Array(8).fill("red"), white: Array(8).fill("white") });
  const [placementMode, setPlacementMode] = useState("click");
  const [winner, setWinner] = useState(null);
  const [dragging, setDragging] = useState(null);
  const screamRef = useRef(null);

  const isValid = (r, c) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

  const checkWin = (brd) => {
    const checkLine = (r, c, dr, dc, color) => {
      let count = 0;
      for (let i = 0; i < 3; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (!isValid(nr, nc) || brd[nr][nc] !== color) return false;
        count++;
      }
      return count === 3;
    };

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const color = brd[r][c];
        if (color && (
          checkLine(r, c, 1, 0, color) ||
          checkLine(r, c, 0, 1, color) ||
          checkLine(r, c, 1, 1, color) ||
          checkLine(r, c, 1, -1, color)
        )) return color;
      }
    }
    return null;
  };

  const canPush = (r, c, dr, dc, brd) => {
    const positions = [];
    while (isValid(r, c) && brd[r][c] !== null) {
      positions.push([r, c]);
      r += dr;
      c += dc;
    }
    if (!isValid(r, c) || brd[r][c] !== null) return null;
    return positions;
  };

  const handlePlace = (row, col) => {
    if (board[row][col] !== null || winner || berserkers[currentPlayer] <= 0) return;

    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = currentPlayer;

    if (screamRef.current) screamRef.current.play();

    directions.forEach(([dr, dc]) => {
      const r1 = row + dr;
      const c1 = col + dc;
      if (isValid(r1, c1) && newBoard[r1][c1] !== null) {
        const chain = canPush(r1, c1, dr, dc, newBoard);
        if (chain) {
          for (let i = chain.length - 1; i >= 0; i--) {
            const [fromR, fromC] = chain[i];
            const toR = fromR + dr;
            const toC = fromC + dc;
            newBoard[toR][toC] = newBoard[fromR][fromC];
            newBoard[fromR][fromC] = null;
          }
        } else if (!isValid(r1 + dr, c1 + dc)) {
          const pushedColor = newBoard[r1][c1];
          newBoard[r1][c1] = null;
          setBerserkers(prev => ({
            ...prev,
            [pushedColor]: prev[pushedColor] + 1,
          }));
        }
      }
    });

    const nextBerserkers = {
      ...berserkers,
      [currentPlayer]: berserkers[currentPlayer] - 1,
    };

    const newStash = {
      ...stash,
      [currentPlayer]: stash[currentPlayer].slice(1),
    };

    const win = checkWin(newBoard);
    if (win) setWinner(win);
    else if (nextBerserkers[currentPlayer] === 0) setWinner(currentPlayer);

    setBoard(newBoard);
    setBerserkers(nextBerserkers);
    setStash(newStash);
    setCurrentPlayer(currentPlayer === "red" ? "white" : "red");
  };

  const handleDrop = (e, row, col) => {
    e.preventDefault();
    if (dragging && placementMode === "drag") {
      handlePlace(row, col);
      setDragging(null);
    }
  };

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setCurrentPlayer("red");
    setBerserkers({ red: INITIAL_BERSERKERS, white: INITIAL_BERSERKERS });
    setStash({ red: Array(8).fill("red"), white: Array(8).fill("white") });
    setWinner(null);
    setDragging(null);
  };

  console.log("Board state:", board);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Berserker Board Game</h1>
      <div className="bg-green-500 text-white p-2 mb-4 rounded">Tailwind is active ✅</div>

      {winner && (
        <div className="mb-2 text-green-600 font-bold text-lg">
          {winner.toUpperCase()} WINS!
        </div>
      )}

      <div className="mb-2">
        <span>Current Player: </span>
        <span className={`font-bold ${currentPlayer === "red" ? "text-red-500" : "text-white"}`}>
          {currentPlayer.toUpperCase()}
        </span>
      </div>

      <div className="mb-4">
        <label className="mr-2 font-medium">Placement Mode:</label>
        <select
          className="border p-1 rounded text-black"
          value={placementMode}
          onChange={(e) => setPlacementMode(e.target.value)}
        >
          <option value="click">Click</option>
          <option value="drag">Drag</option>
        </select>
      </div>

      {placementMode === "drag" && (
        <div className="flex space-x-2 mb-4">
          {stash[currentPlayer].map((_, idx) => (
            <div
              key={idx}
              className={`w-8 h-8 rounded-full cursor-move ${
                currentPlayer === "red" ? "bg-red-500" : "bg-white"
              }`}
              draggable
              onDragStart={() => setDragging(currentPlayer)}
            ></div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-6 gap-1 bg-gray-800 p-2 w-fit border-4 border-pink-500">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="w-12 h-12 bg-gray-200 border border-black flex items-center justify-center"
              onClick={() => placementMode === "click" && handlePlace(rowIndex, colIndex)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
            >
              {cell ? (
                <div
                  className={`w-8 h-8 rounded-full ${
                    cell === "red" ? "bg-red-500" : "bg-white"
                  }`}
                ></div>
              ) : (
                <span role="img" aria-label="empty hole" className="text-xs">🕳️</span>
              )}
            </div>
          ))
        )}
      </div>

      <button
        onClick={resetGame}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Reset Game
      </button>

      <audio ref={screamRef} src="/berserker-scream.mp3" preload="auto" />
    </div>
  );
}
