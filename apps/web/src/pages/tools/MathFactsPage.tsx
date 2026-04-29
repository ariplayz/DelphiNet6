import React, { useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

type Operation = 'multiply' | 'divide';
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_MAX: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 12,
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem(op: Operation, difficulty: Difficulty) {
  const max = DIFFICULTY_MAX[difficulty];
  if (op === 'multiply') {
    const a = randInt(1, max);
    const b = randInt(1, max);
    return { a, b, answer: a * b, display: `${a} × ${b} = ?` };
  } else {
    const b = randInt(1, max);
    const answer = randInt(1, max);
    const a = b * answer;
    return { a, b, answer, display: `${a} ÷ ${b} = ?` };
  }
}

export function MathFactsPage() {
  const [operation, setOperation] = useState<Operation>('multiply');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [problem, setProblem] = useState(() => generateProblem('multiply', 'medium'));
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const nextProblem = useCallback(
    (op: Operation, diff: Difficulty) => {
      setProblem(generateProblem(op, diff));
      setInput('');
      setFeedback(null);
    },
    [],
  );

  const handleCheck = () => {
    const guess = parseInt(input, 10);
    if (isNaN(guess)) return;
    const isCorrect = guess === problem.answer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setTotal((t) => t + 1);
    if (isCorrect) setCorrect((c) => c + 1);
    setTimeout(() => nextProblem(operation, difficulty), 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && feedback === null) handleCheck();
  };

  const handleReset = () => {
    setCorrect(0);
    setTotal(0);
    setFeedback(null);
    setInput('');
    setProblem(generateProblem(operation, difficulty));
  };

  const changeOperation = (op: Operation) => {
    setOperation(op);
    nextProblem(op, difficulty);
  };

  const changeDifficulty = (diff: Difficulty) => {
    setDifficulty(diff);
    nextProblem(operation, diff);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-text-primary">Math Facts</h1>
        <p className="text-text-secondary text-sm">Practice multiplication and division</p>
      </div>

      {/* Controls */}
      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">Operation</p>
            <div className="flex gap-2">
              {(['multiply', 'divide'] as Operation[]).map((op) => (
                <Button
                  key={op}
                  variant={operation === op ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => changeOperation(op)}
                  className="flex-1"
                >
                  {op === 'multiply' ? '× Multiply' : '÷ Divide'}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">Difficulty</p>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                <Button
                  key={diff}
                  variant={difficulty === diff ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => changeDifficulty(diff)}
                  className="flex-1 capitalize"
                >
                  {diff}
                  <span className="text-xs opacity-70">
                    {diff === 'easy' ? ' (1–5)' : diff === 'medium' ? ' (1–10)' : ' (1–12)'}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Problem */}
      <Card>
        <div className="flex flex-col items-center gap-6 py-4">
          <p className="text-5xl font-bold text-text-primary tracking-wide">
            {problem.display}
          </p>

          <input
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={feedback !== null}
            placeholder="?"
            className="w-32 text-center text-3xl font-bold rounded-xl px-4 py-3 min-h-[60px] bg-bg-elevated border-2 border-border text-text-primary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
            autoFocus
          />

          {feedback === 'correct' && (
            <p className="text-2xl font-bold text-success">✓ Correct!</p>
          )}
          {feedback === 'wrong' && (
            <p className="text-xl font-bold text-danger">
              ✗ Wrong — answer is {problem.answer}
            </p>
          )}

          {feedback === null && (
            <Button onClick={handleCheck} disabled={input === ''} size="lg" className="w-full max-w-xs">
              Check
            </Button>
          )}
        </div>
      </Card>

      {/* Score */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-3xl font-bold text-brand">{correct}</p>
            <p className="text-xs text-text-secondary mt-1">Correct</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center flex-1">
            <p className="text-3xl font-bold text-text-primary">{total}</p>
            <p className="text-xs text-text-secondary mt-1">Total</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center flex-1">
            <p className="text-3xl font-bold text-text-primary">
              {total > 0 ? Math.round((correct / total) * 100) : 0}%
            </p>
            <p className="text-xs text-text-secondary mt-1">Score</p>
          </div>
        </div>
      </Card>

      <Button variant="secondary" onClick={handleReset} className="w-full">
        Reset
      </Button>
    </div>
  );
}
