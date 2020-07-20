import { mount, shallow } from 'enzyme'
import React from 'react'

import ParagraphStyles from '../../../../src/scripts/oboeditor/components/toolbars/paragraph-styles'

const HEADING_NODE = 'ObojoboDraft.Chunks.Heading'
const CODE_NODE = 'ObojoboDraft.Chunks.Code'
const TEXT_NODE = 'ObojoboDraft.Chunks.Text'

jest.useFakeTimers()

describe('Paragraph Styles', () => {
	test('Paragraph Styles node', () => {
		const editor = {
			children: [
				{
					type: TEXT_NODE,
					children: [{ text: 'mockText' }]
				},
				{
					type: CODE_NODE,
					children: [{ text: 'mockText' }]
				}
			],
			selection: {
				anchor: { path: [0, 0], offset: 1 },
				focus: { path: [1, 0], offset: 1 }
			},
			isInline: () => false,
			isVoid: () => false
		}
		const component = mount(<ParagraphStyles editor={editor} />)
		const tree = component.html()
		expect(tree).toMatchSnapshot()
	})

	test('Paragraph Styles node opens and closes', () => {
		const editor = {
			children: [
				{
					type: CODE_NODE,
					children: [{ text: 'mockText' }]
				}
			],
			selection: {
				anchor: { path: [0, 0], offset: 1 },
				focus: { path: [0, 0], offset: 1 }
			},
			isInline: () => false,
			isVoid: () => false
		}
		const component = mount(<ParagraphStyles editor={editor} />)

		component
			.find('button')
			.at(0)
			.simulate('click')

		expect(component.html()).toMatchSnapshot()

		component
			.find('button')
			.at(0)
			.simulate('click')

		expect(component.html()).toMatchSnapshot()
	})

	test('Paragraph Styles calls editor.changeToType', () => {
		const editor = {
			children: [
				{
					type: TEXT_NODE,
					children: [{ text: 'mockText' }]
				}
			],
			selection: {
				anchor: { path: [0, 0], offset: 1 },
				focus: { path: [0, 0], offset: 1 }
			},
			isInline: () => false,
			isVoid: () => false,
			changeToType: jest.fn()
		}
		const component = mount(<ParagraphStyles editor={editor} />)

		component
			.find('button')
			.at(1)
			.simulate('click')
		component
			.find('button')
			.at(2)
			.simulate('click')
		component
			.find('button')
			.at(3)
			.simulate('click')
		component
			.find('button')
			.at(4)
			.simulate('click')
		component
			.find('button')
			.at(5)
			.simulate('click')
		component
			.find('button')
			.at(6)
			.simulate('click')
		component
			.find('button')
			.at(7)
			.simulate('click')
		component
			.find('button')
			.at(8)
			.simulate('click')

		expect(editor.changeToType).toHaveBeenCalledTimes(8)
	})

	test('Paragraph Styles component opens and closes menu with keys', () => {
		const editor = {
			children: [
				{
					type: 'MockNode',
					children: [{ text: 'mockText' }]
				}
			],
			selection: {
				anchor: { path: [0, 0], offset: 1 },
				focus: { path: [0, 0], offset: 1 }
			},
			isInline: () => false,
			isVoid: () => false,
			changeToType: jest.fn()
		}
		const component = mount(<ParagraphStyles editor={editor} />)

		component
			.find('div')
			.at(0)
			.simulate('keyDown', {
				key: 'ArrowRight',
				stopPropagation: jest.fn()
			})

		expect(component.html()).toMatchSnapshot()

		component
			.find('div')
			.at(0)
			.simulate('keyDown', {
				key: 'ArrowLeft',
				stopPropagation: jest.fn()
			})

		expect(component.html()).toMatchSnapshot()
	})

	test('Paragraph Styles component moves up and down with keys', () => {
		const editor = {
			children: [
				{
					type: CODE_NODE,
					children: [{ text: 'mockText' }]
				}
			],
			selection: null,
			isInline: () => false,
			isVoid: () => false,
			changeToType: jest.fn()
		}
		const component = shallow(<ParagraphStyles editor={editor} />)

		component
			.find('div')
			.at(0)
			.simulate('keyDown', {
				key: 'ArrowUp',
				stopPropagation: jest.fn()
			})

		expect(component.state()).toMatchSnapshot()

		component
			.find('div')
			.at(0)
			.simulate('keyDown', {
				key: 'ArrowDown',
				stopPropagation: jest.fn()
			})

		expect(component.state()).toMatchSnapshot()
	})

	test('Paragraph Styles component closes menu when unfocused', () => {
		const editor = {
			children: [
				{
					type: HEADING_NODE,
					content: { headingLevel: 1 },
					children: [{ text: 'mockText' }]
				}
			],
			selection: {
				anchor: { path: [0, 0], offset: 1 },
				focus: { path: [0, 0], offset: 1 }
			},
			isInline: () => false,
			isVoid: () => false,
			changeToType: jest.fn()
		}
		const component = shallow(<ParagraphStyles editor={editor} />)

		const html = component
			.find('div')
			.at(0)
			.simulate('blur')
			.html()

		jest.runAllTimers()

		expect(html).toMatchSnapshot()
	})

	test('Paragraph Styles component cancels menu closure when focused', () => {
		const editor = {
			children: [
				{
					type: HEADING_NODE,
					content: { headingLevel: 2 },
					children: [{ text: 'mockText' }]
				},
				{
					type: HEADING_NODE,
					content: { headingLevel: 1 },
					children: [{ text: 'mockText' }]
				}
			],
			selection: {
				anchor: { path: [0, 0], offset: 1 },
				focus: { path: [1, 0], offset: 1 }
			},
			isInline: () => false,
			isVoid: () => false,
			changeToType: jest.fn()
		}
		const component = shallow(<ParagraphStyles editor={editor} />)

		const html = component
			.find('div')
			.at(0)
			.simulate('focus')
			.html()

		jest.runAllTimers()

		expect(html).toMatchSnapshot()
	})
})
