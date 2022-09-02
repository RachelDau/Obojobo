import Common from 'obojobo-document-engine/src/scripts/common'
import ViewerComponent from './viewer-component'

Common.Registry.registerModel('ObojoboDraft.Sections.Content', {
	adapter: null,
	componentClass: ViewerComponent,
	default: true,
	type: 'section',
	getNavItem: () => ({
		type: 'hidden',
		showChildren: true
	})
})
