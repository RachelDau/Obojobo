import React from 'react'

import {
	EXACT_ANSWER,
	MARGIN_OF_ERROR,
	WITHIN_A_RANGE,
	requirementDropdown,
	marginDropdown,
	simplifedToFullText
} from '../constants'

const NumericOption = ({ numericChoice, onHandleInputChange, onHandleSelectChange }) => {
	const { requirement, answer, start, end, margin, type } = numericChoice

	switch (simplifedToFullText[requirement]) {
		case WITHIN_A_RANGE:
			return (
				<div className="is-type-range">
					<label className="select requirement">
						Answer Type
						<select
							className="select-item"
							name="requirement"
							value={simplifedToFullText[requirement]}
							onChange={event => onHandleSelectChange(event)}
						>
							{requirementDropdown.map(requirement => (
								<option key={requirement}>{requirement}</option>
							))}
						</select>
					</label>
					<label className="input start">
						Start
						<input
							className="input-item"
							name="start"
							value={start || ''}
							onChange={event => onHandleInputChange(event)}
							contentEditable={false}
							autoComplete="off"
						/>
					</label>
					<label className="input end">
						End
						<input
							className="input-item"
							name="end"
							value={end || ''}
							onChange={event => onHandleInputChange(event)}
							contentEditable={false}
							autoComplete="off"
						/>
					</label>
				</div>
			)
		case MARGIN_OF_ERROR:
			return (
				<div className="is-type-margin">
					<label className="select requirement">
						Answer Type
						<select
							className="select-item"
							name="requirement"
							value={simplifedToFullText[requirement]}
							onChange={event => onHandleSelectChange(event)}
						>
							{requirementDropdown.map(requirement => (
								<option key={requirement}>{requirement}</option>
							))}
						</select>
					</label>
					<label className="input answer">
						Answer
						<input
							className="input-item"
							name="answer"
							value={answer || ''}
							onChange={event => onHandleInputChange(event)}
							contentEditable={false}
							autoComplete="off"
						/>
					</label>
					<label className="select margin-type">
						Error Type
						<select
							className="select-item"
							name="margin-type"
							value={simplifedToFullText[type]}
							onChange={event => onHandleSelectChange(event)}
						>
							{marginDropdown.map(type => (
								<option key={type}>{type}</option>
							))}
						</select>
					</label>
					<label className="input margin-value">
						{type === 'percent' ? '% Error' : '± Error'}
						<input
							className="input-item"
							name="margin"
							value={margin || ''}
							onChange={event => onHandleInputChange(event)}
							contentEditable={false}
							autoComplete="off"
						/>
					</label>
				</div>
			)
		default:
		case EXACT_ANSWER:
			return (
				<div className="is-type-exact">
					<label className="select requirement">
						Answer Type
						<select
							className="select-item"
							name="requirement"
							value={simplifedToFullText[requirement]}
							onChange={event => onHandleSelectChange(event)}
						>
							{requirementDropdown.map(requirement => (
								<option key={requirement}>{requirement}</option>
							))}
						</select>
					</label>
					<label className="input answer">
						Answer
						<input
							className="input-item"
							name="answer"
							value={answer || ''}
							onChange={event => onHandleInputChange(event)}
							contentEditable={false}
							autoComplete="off"
						/>
					</label>
				</div>
			)
	}
}

export default NumericOption
