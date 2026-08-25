import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssessmentModal from './AssessmentModal';

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

import { api } from '../../api/client';

const questionsPayload = {
  skillName: 'JavaScript',
  source: 'AI-generated',
  companyName: null,
  timeLimitMinutes: 10,
  questions: [
    { questionId: 1, text: 'What is a closure?', options: ['Closure option 1', 'Option B', 'Option C', 'Option D'] },
    { questionId: 2, text: 'What is hoisting?', options: ['Hoisting option 1', 'Option B', 'Option C', 'Option D'] },
  ],
};

const submitResult = {
  scorePercent: 100,
  correctAnswers: 2,
  totalQuestions: 2,
  scoredLevel: 4,
  levelLabel: 'Expert',
};

describe('AssessmentModal', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
  });

  it('renders nothing when closed', () => {
    api.get.mockResolvedValue(questionsPayload);

    const { container } = render(
      <AssessmentModal open={false} onClose={vi.fn()} assessmentId={1} skillName="JavaScript" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a loading state while fetching questions', async () => {
    let resolveFn;
    api.get.mockImplementation(() => new Promise((resolve) => { resolveFn = resolve; }));

    render(<AssessmentModal open onClose={vi.fn()} assessmentId={1} skillName="JavaScript" />);

    expect(screen.getByText('Preparing your assessment...')).toBeInTheDocument();

    resolveFn(questionsPayload);
    await screen.findByText('What is a closure?');
  });

  it('loads and displays the first question with options', async () => {
    api.get.mockResolvedValue(questionsPayload);

    render(<AssessmentModal open onClose={vi.fn()} assessmentId={1} skillName="JavaScript" />);

    expect(await screen.findByText('Question 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('What is a closure?')).toBeInTheDocument();
    expect(screen.getByText('AI-generated assessment')).toBeInTheDocument();
    expect(screen.getByText('Closure option 1')).toBeInTheDocument();
    expect(screen.getByText('0/2 answered')).toBeInTheDocument();
  });

  it('selects an answer and advances to the next question', async () => {
    api.get.mockResolvedValue(questionsPayload);

    render(<AssessmentModal open onClose={vi.fn()} assessmentId={1} skillName="JavaScript" />);

    await screen.findByText('What is a closure?');
    fireEvent.click(screen.getByText('Option B'));
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(await screen.findByText('Question 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('What is hoisting?')).toBeInTheDocument();
    expect(screen.getByText('1/2 answered')).toBeInTheDocument();
  });

  it('backs up from the second question', async () => {
    api.get.mockResolvedValue(questionsPayload);

    render(<AssessmentModal open onClose={vi.fn()} assessmentId={1} skillName="JavaScript" />);

    await screen.findByText('What is a closure?');
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByText('What is hoisting?');
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));

    expect(await screen.findByText('What is a closure?')).toBeInTheDocument();
  });

  it('submits answers and shows the completed screen', async () => {
    api.get.mockResolvedValue(questionsPayload);
    api.post.mockResolvedValue(submitResult);

    render(<AssessmentModal open onClose={vi.fn()} assessmentId={1} skillName="JavaScript" />);

    await screen.findByText('What is a closure?');
    fireEvent.click(screen.getByText('Closure option 1'));
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByText('What is hoisting?');
    fireEvent.click(screen.getByText('Hoisting option 1'));
    fireEvent.click(screen.getByRole('button', { name: /Finish/ }));

    expect(await screen.findByText('Assessment complete')).toBeInTheDocument();
    expect(screen.getByText('100% score')).toBeInTheDocument();
    expect(screen.getByText(/You answered 2 of 2 correctly/)).toBeInTheDocument();
    expect(screen.getByText(/New verified level · 4 Expert/)).toBeInTheDocument();

    expect(api.post).toHaveBeenCalledWith('/assessments/1/submit', {
      answers: [
        { questionId: 1, selectedOption: 0 },
        { questionId: 2, selectedOption: 0 },
      ],
    });
  });

  it('shows an error when questions fail to load', async () => {
    api.get.mockRejectedValue(new Error('boom'));

    render(<AssessmentModal open onClose={vi.fn()} assessmentId={1} skillName="JavaScript" />);

    expect(await screen.findByText('Failed to load questions')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('calls onClose from the error state Close button', async () => {
    api.get.mockRejectedValue(new Error('boom'));
    const onClose = vi.fn();

    render(<AssessmentModal open onClose={onClose} assessmentId={1} skillName="JavaScript" />);
    await screen.findByText('Failed to load questions');

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('warns when the learner leaves and returns to the assessment tab', async () => {
    api.get.mockResolvedValue(questionsPayload);
    api.post.mockResolvedValue({ recorded: true });

    render(<AssessmentModal open onClose={vi.fn()} assessmentId={1} skillName="JavaScript" />);
    await screen.findByText('What is a closure?');

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    fireEvent(document, new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    fireEvent(document, new Event('visibilitychange'));

    expect(screen.getByText('You left the assessment tab')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/assessments/1/integrity-event', {
      eventType: 'TabLeft',
      detail: 'Learner left the assessment tab for JavaScript',
    });

    fireEvent.click(screen.getByText('Resume assessment'));
    expect(screen.queryByText('You left the assessment tab')).not.toBeInTheDocument();
  });

  it('logs an integrity event when the tab is left mid-assessment', async () => {
    api.get.mockResolvedValue(questionsPayload);
    api.post.mockResolvedValue({ recorded: true });

    render(<AssessmentModal open onClose={vi.fn()} assessmentId={1} skillName="JavaScript" />);
    await screen.findByText('What is a closure?');

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    fireEvent(document, new Event('visibilitychange'));

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/assessments/1/integrity-event', {
      eventType: 'TabLeft',
      detail: 'Learner left the assessment tab for JavaScript',
    });
  });

  it('does not warn about tab switches after completion', async () => {
    api.get.mockResolvedValue(questionsPayload);
    api.post.mockResolvedValue(submitResult);

    render(<AssessmentModal open onClose={vi.fn()} assessmentId={1} skillName="JavaScript" />);
    await screen.findByText('What is a closure?');
    fireEvent.click(screen.getByText('Closure option 1'));
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByText('What is hoisting?');
    fireEvent.click(screen.getByText('Hoisting option 1'));
    fireEvent.click(screen.getByRole('button', { name: /Finish/ }));
    await screen.findByText('Assessment complete');

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    fireEvent(document, new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    fireEvent(document, new Event('visibilitychange'));

    expect(screen.queryByText('You left the assessment tab')).not.toBeInTheDocument();
  });
});