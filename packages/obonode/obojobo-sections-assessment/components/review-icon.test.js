import React from 'react'
import renderer from 'react-test-renderer'

import ReviewIcon from './review-icon'

describe('ReviewIcon', () => {
	test('ReviewIcon component', () => {
		const component = renderer.create(<ReviewIcon />)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})
})
