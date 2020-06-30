import './viewer-component.scss'

// import { CSSTransition } from 'react-transition-group'
import React from 'react'
import Common from 'obojobo-document-engine/src/scripts/common'
import Viewer from 'obojobo-document-engine/src/scripts/viewer'
import _ from 'underscore'
import isOrNot from 'obojobo-document-engine/src/scripts/common/util/isornot'
import NumericAnswerEvaluator from './evaluation/numeric-answer-evaluator'
import QuestionUtil from 'obojobo-document-engine/src/scripts/viewer/util/question-util'
import NumericInputMoreInfoButton from './numeric-input-more-info-button'
const { PERCENT_ERROR, ABSOLUTE_ERROR } = require('./rule/rule-error-types')

const { OboComponent, OboQuestionAssessmentComponent, Flag } = Viewer.components
const { NavUtil } = Viewer.util
const { OboModel } = Common.models
const { ErrorUtil } = Common.util

const KEY_FEEDBACK = 'feedback'
const LONG_RESPONSE_NUM_CHARS = 19

export default class NumericAssessment extends OboQuestionAssessmentComponent {
	constructor(props) {
		super(props)

		// this.matchMedia = window.matchMedia('(max-width: 980px)')
		// this.onMatchMediaChanged = this.onMatchMediaChanged.bind(this)
		// this.matchMedia.addListener(this.onMatchMediaChanged)

		this.onInputBlur = this.onInputBlur.bind(this)

		this.evaluator = new NumericAnswerEvaluator({
			scoreRuleConfigs: props.model.modelState.scoreRules
		})
		console.log('eval', this.evaluator)

		// debugger

		// this.onInputChange = this.onInputChange.bind(this)

		// this.state = {
		// 	feedback: null
		// }

		// this.state = {
		// 	isScreenLte980Px: false
		// }
	}

	// componentDidMount() {
	// 	this.setState({
	// 		isScreenLte980Px: this.matchMedia.matches
	// 	})
	// }

	// componentWillUnmount() {
	// 	this.matchMedia.removeListener(this.onMatchMediaChanged)
	// }

	// onMatchMediaChanged() {
	// 	this.setState({
	// 		isScreenLte980Px: this.matchMedia.matches
	// 	})
	// }

	static getRevealAnswerDefault() {
		return 'when-incorrect'
	}

	static getInstructions(questionModel, questionAssessmentModel) {
		return (
			<React.Fragment>
				<span className="for-screen-reader-only">{`Form with one input. `}</span>
				Input your answer
			</React.Fragment>
		)
	}

	static isResponseEmpty(response) {
		return response.value === ''
	}

	// static getDerivedStateFromProps(props, state) {
	// 	if (props.response !== state.response) {
	// 		return {
	// 			response: props.response
	// 		}
	// 	}
	// }

	// onInputChange(event) {
	// 	this.setState({
	// 		response: event.target.value
	// 	})
	// }

	setFeedback(feedback) {
		QuestionUtil.setData(
			this.props.model.get('id'),
			NavUtil.getContext(this.props.moduleData.navState),
			KEY_FEEDBACK,
			feedback
		)
	}

	clearFeedback() {
		QuestionUtil.clearData(
			this.props.model.get('id'),
			NavUtil.getContext(this.props.moduleData.navState),
			KEY_FEEDBACK
		)
	}

	getFeedback() {
		return QuestionUtil.getData(
			this.props.moduleData.questionState,
			this.props.model,
			NavUtil.getContext(this.props.moduleData.navState),
			KEY_FEEDBACK
		)
	}

	// getCorrectResponse() {
	// 	// Get the first correct response
	// 	const correctRules = this.evaluator.grader.rules.filter(r => r.score === 100)

	// 	if(correctRules.length === 0) {
	// 		return null
	// 	}

	// 	return {
	// 		state: {
	// 			value: correctRules[0].
	// 		},
	// 		targetId: null
	// 	}
	// }

	calculateScore() {
		const questionResponse = this.props.response.value

		// debugger

		const results = this.evaluator.evaluate(questionResponse)
		console.log('results', results)
		// this.results = results

		switch (results.status) {
			case 'inputInvalid':
				ErrorUtil.show('Invalid Input', 'Please enter a valid numeric value')
				return null

			default: {
				let feedback = null
				if (
					results.details.matchingOutcome &&
					results.details.matchingOutcome.rule &&
					results.details.matchingOutcome.rule.feedback
				) {
					feedback = results.details.matchingOutcome.rule.feedback
				}

				this.setFeedback(feedback)

				return {
					score: results.details.score,
					details: results.details
				}
			}
		}
	}

	retry() {
		QuestionUtil.retryQuestion(
			this.props.questionModel.get('id'),
			this.props.moduleData.navState.context
		)
	}

	handleFormChange(event) {
		if (this.props.score !== null) {
			this.retry()
		}

		return {
			state: {
				value: event.target.value
			},
			targetId: null,
			sendResponseImmediately: false
		}
	}

	onInputBlur() {
		QuestionUtil.sendResponse(
			this.props.questionModel.get('id'),
			NavUtil.getContext(this.props.moduleData.navState)
		)
	}

	getRangeSummary(range) {
		const min = range.min ? range.min.toString() : null
		const max = range.max ? range.max.toString() : null

		console.log('grs', range, min, max)

		if (range.isSingular) {
			return {
				type: 'value',
				value: min
			}
		}

		if (range.isEmpty) {
			return {
				type: 'text',
				text: 'Nothing'
			}
		}

		if (range.isUniversal) {
			return {
				type: 'text',
				text: 'Any value'
			}
		}

		if (!range.isBounded) {
			if (range.min === null) {
				// Values from -Infinity to some value:
				return {
					type: 'text-and-value',
					text: range.isMaxInclusive ? 'At most' : 'Less than',
					value: max
				}
			} else {
				// Values from some value to Infinity:
				return {
					type: 'text-and-value',
					text: range.isMinInclusive ? 'At least' : 'Greater than',
					value: min
				}
			}
		}

		const isFullyInclusive = range.isMinInclusive && range.isMaxInclusive
		if (isFullyInclusive) {
			return {
				type: 'range',
				min,
				max,
				conjunction: 'to'
			}
		}

		let minPrefix = ''
		let maxPrefix = ''

		if (range.isMinInclusive) {
			minPrefix = 'Greater than or equal to'
		} else {
			minPrefix = 'Greater than'
		}

		if (range.isMaxInclusive) {
			maxPrefix = 'less than or equal to'
		} else {
			maxPrefix = 'less than'
		}

		return {
			type: 'range',
			minPrefix,
			maxPrefix,
			min,
			max,
			conjunction: 'and'
		}
	}

	// getRangeSummaryString(rangeSummary) {
	// 	return `${summary.minPrefix ? summary.minPrefix : ''
	// 					<span className="value">{summary.min}</span>
	// 					<span> {summary.conjunction} </span>
	// 					{summary.maxPrefix ? <span>{summary.maxPrefix} </span> : null}
	// 					<span className="value">{summary.max}</span>
	// }

	getRuleModSummaries(rule) {
		// const valueSummary = this.getRangeSummary(rule.value)

		const mods = []

		switch (rule.errorType) {
			case ABSOLUTE_ERROR:
				mods.push(`±${rule.errorValue.toString()} Error accepted`)
				break

			case PERCENT_ERROR:
				mods.push(`${rule.errorValue.toString()}% Error accepted`)
				break
		}

		if (!rule.sigFigs.isUniversal) {
			mods.push(
				`With ${this.getRangeSummaryString(
					this.getRangeSummary(rule.sigFigs)
				).toLowerCase()} significant figures`
			)
		}

		//@TODO - Is anything being done with digits?
		// let digitsMod = ''
		// if (!rule.digits.isUniversal) {
		// 	digitsMod = `${this.getRangeSummary(rule.digits)} number`
		// }

		switch (rule.isFractionReduced) {
			case true:
				mods.push('Must be in reduced form')
				break

			case false:
				mods.push('Not in reduced form')
				break
		}

		// switch (mods.length) {
		// 	case 0:
		// 		return valueSummary

		// 	case 1:
		// 		debugger
		// 		return valueSummary + ' (' + mods[0] + ')'

		// 	case 2:
		// 		return valueSummary + ' (' + mods[0] + ' and ' + mods[1] + ')'

		// 	default:
		// 		return (
		// 			valueSummary +
		// 			' (' +
		// 			mods.slice(0, mods.length - 2).join(', ') +
		// 			' and ' +
		// 			mods[mods.length - 1] +
		// 			')'
		// 		)
		// }

		return mods

		// @TODO - scientific types
		// @TODO - isValidScientific
		// @TODO - round

		// if (rule.value.isSingular) {
		// 	return {
		// 		type: 'single',
		// 		value: min
		// 	}
		// }

		// const isFullyInclusive = rule.value.isMinInclusive && rule.value.isMaxInclusive
		// if (isFullyInclusive) {
		// 	return {
		// 		type: 'range',
		// 		min,
		// 		max,
		// 		conjunction: 'to'
		// 	}
		// }

		// let minPrefix = ''
		// let maxPrefix = ''

		// if (rule.value.isMinInclusive) {
		// 	minPrefix = 'Greater than or equal to'
		// } else {
		// 	minPrefix = 'Greater than'
		// }

		// if (rule.value.isMaxInclusive) {
		// 	maxPrefix = 'less than or equal to'
		// } else {
		// 	maxPrefix = 'less than'
		// }

		// return {
		// 	type: 'range',
		// 	minPrefix,
		// 	maxPrefix,
		// 	min,
		// 	max,
		// 	conjunction: 'and'
		// }
	}

	getRangeSummaryString(summary) {
		switch (summary.type) {
			case 'text':
				return summary.text

			case 'value':
				return summary.value

			case 'text-and-value':
				return summary.text + ' ' + summary.value

			case 'range':
				return `${summary.minPrefix ? summary.minPrefix : ''} ${summary.min} ${
					summary.conjunction
				} ${summary.maxPrefix ? summary.maxPrefix : ''} ${summary.max}`
		}
	}

	renderRangeSummary(summary) {
		console.log('rrs', summary)

		switch (summary.type) {
			case 'text':
				return <span>{summary.text}</span>

			case 'value':
				return <span className="value">{summary.value}</span>

			case 'text-and-value':
				return (
					<React.Fragment>
						<span>{summary.text}</span> <span className="value">{summary.value}</span>
					</React.Fragment>
				)

			case 'range':
				return (
					<React.Fragment>
						{summary.minPrefix ? <span>{summary.minPrefix} </span> : null}
						<span className="value">{summary.min}</span>
						<span> {summary.conjunction} </span>
						{summary.maxPrefix ? <span>{summary.maxPrefix} </span> : null}
						<span className="value">{summary.max}</span>
					</React.Fragment>
				)
		}
	}

	renderRuleModSummaries(mods) {
		switch (mods.length) {
			case 0:
				return ''

			case 1:
				return ' (' + mods[0] + ')'

			case 2:
				return ' (' + mods[0] + ' and ' + mods[1] + ')'

			default:
				return (
					' (' + mods.slice(0, mods.length - 2).join(', ') + ' and ' + mods[mods.length - 1] + ')'
				)
		}
	}

	render() {
		const score = this.props.score
		const scoreClass = this.props.scoreClass
		const hasResponse = this.props.hasResponse
		const isScored = score !== null
		// const isAnswerRevealed = this.props.isAnswerRevealed
		const feedback = this.getFeedback()
		const feedbackModel = feedback ? OboModel.create(feedback) : null
		const FeedbackComponent = feedbackModel ? feedbackModel.getComponentClass() : null
		const correctRules = this.evaluator.grader.rules.filter(rule => rule.score === 100)

		//@TODO
		const questionResponse = this.props.response ? this.props.response.value : null

		// console.log('CALCULATE SCORE', questionResponse)

		// debugger
		let results
		try {
			results = questionResponse ? this.evaluator.evaluate(questionResponse) : null
		} catch (e) {
			results = null
		}
		const matchingCorrectRule =
			results && results.details && results.details.matchingOutcome
				? results.details.matchingOutcome.rule
				: null
		//@END TODO

		const responseValue =
			this.props.response && this.props.response.value ? this.props.response.value : ''

		const isExactlyCorrect =
			isScored && score === 100 && results.details.matchingOutcome.scoreOutcome.isExactlyCorrect

		const className =
			'obojobo-draft--chunks--numeric-assessment' +
			` is-response-type-${this.props.model.modelState.responseType}` +
			` is-mode-${this.props.mode}` +
			` is-type-${this.props.type}` +
			isOrNot(
				!(isScored && !isExactlyCorrect) && responseValue.length >= LONG_RESPONSE_NUM_CHARS,
				'long-response'
			) +
			isOrNot(hasResponse, 'responded-to') +
			` ${scoreClass}` +
			// isOrNot(isShowingExplanationValue, 'showing-explanation') +
			isOrNot(score !== null, 'scored')

		return (
			<OboComponent
				model={this.props.model}
				moduleData={this.props.moduleData}
				className={className}
			>
				<div className="input-section pad">
					<div className="input-container">
						<input
							autoComplete="off"
							className="numeric-assessment--input"
							placeholder={this.props.mode !== 'review' ? 'Your answer...' : '(No answer given)'}
							value={responseValue}
							disabled={this.props.mode === 'review'}
							onBlur={this.onInputBlur}
							// onChange={this.onInputChange}
						/>
						<NumericInputMoreInfoButton />
						{score === 100 && !isExactlyCorrect ? (
							<span className="matching-correct-answer">
								(Exact answer:{' '}
								<span className="value">
									{this.renderRangeSummary(this.getRangeSummary(matchingCorrectRule.value))}
								</span>
								)
							</span>
						) : null}
					</div>
					{isScored && feedback ? (
						<FeedbackComponent model={feedbackModel} moduleData={this.props.moduleData} />
					) : null}
					{this.props.mode === 'review' ? (
						<div className="review">
							<Flag
								// small={this.state.isScreenLte980Px}
								type={Flag.getType(
									score === 100,
									score === 100,
									true,
									this.props.questionModel.modelState.type === 'survey'
								)}
							/>
							{score !== 'no-score' && score !== 100 ? (
								<div className="correct-answers">
									{correctRules.length === 1 ? (
										<React.Fragment>
											<h2>Correct answer: </h2>
											<div>
												<span>
													{this.renderRangeSummary(this.getRangeSummary(correctRules[0].value))}
												</span>
												<span>
													{this.renderRuleModSummaries(this.getRuleModSummaries(correctRules[0]))}
												</span>
											</div>
										</React.Fragment>
									) : (
										<React.Fragment>
											<h2>Correct answers:</h2>
											{correctRules.length === 0 ? (
												<span className="no-correct-answers">
													(There are no correct answers for this question)
												</span>
											) : (
												<ul>
													{correctRules.map((rule, index) => {
														return (
															<li key={index}>
																<span>
																	{this.renderRangeSummary(this.getRangeSummary(rule.value))}
																</span>
																<span>
																	{this.renderRuleModSummaries(this.getRuleModSummaries(rule))}
																</span>
															</li>
														)
													})}
												</ul>
											)}
										</React.Fragment>
									)}
								</div>
							) : null}
						</div>
					) : null}
				</div>
			</OboComponent>
		)
	}
}
