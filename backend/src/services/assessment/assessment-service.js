import { gradeAnswer } from './deterministic-grader.js'
import { getQuestion } from './question-repository.js'

/**
 * Practice assessment service. Coordinates question lookup, deterministic grading,
 * and response construction.
 */
export class AssessmentService {
  constructor() {
    // No config needed since AI grading is removed
  }

  /**
   * Grade a practice submitted answer.
   *
   * @param {object} params
   * @param {string} params.questionId
   * @param {string} params.answer          - child's submitted answer (untrusted)
   * @param {'en'|'hi'|'kn'} params.language
   * @param {'nursery'|'lkg'|'ukg'} params.gradeLevel
   * @param {'text'|'tap'} params.answerMode
   * @returns {Promise<any>}
   */
  async grade({ questionId, answer, language, gradeLevel, answerMode }) {
    // 1. Resolve the question from the server-side repository
    const question = getQuestion(questionId)
    if (!question) {
      return null
    }

    // 2. Grade deterministically with spelling tolerance enabled for English practice
    const { correct, score, reasonCode } = gradeAnswer(
      answer,
      question.correctAnswer,
      question.acceptedAnswers || [],
      language,
      { allowSpellingTolerance: true }
    )

    const feedback = correct
      ? this._positiveFeedback(language)
      : this._retryFeedback(language)

    return {
      correct,
      score,
      feedback,
      gradingMethod: 'deterministic',
      difficultyAdjustment: correct ? 'increase' : 'decrease',
      reasonCode,
    }
  }

  _positiveFeedback(language) {
    const phrases = {
      en: ['Great job!', 'Well done!', 'Excellent!', 'That is correct!'],
      hi: ['बहुत अच्छा!', 'शाबाश!', 'बढ़िया!'],
      kn: ['ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ!', 'ಭೇಷ್!', 'ಅದ್ಭುತ!'],
    }
    const options = phrases[language] ?? phrases.en
    return options[Math.floor(Math.random() * options.length)]
  }

  _retryFeedback(language) {
    const phrases = {
      en: ['Try once more!', "That's not quite right, try again!", 'Keep trying!'],
      hi: ['फिर से कोशिश करो!', 'एक बार और कोशिश करो!'],
      kn: ['ಮತ್ತೊಮ್ಮೆ प्रयत्नಿಸಿ!', 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ!'],
    }
    const options = phrases[language] ?? phrases.en
    return options[Math.floor(Math.random() * options.length)]
  }
}
