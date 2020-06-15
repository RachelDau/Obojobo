// Main entrypoint for editor
import Common from 'obojobo-document-engine/src/scripts/common'
import EditorNode from './editor-registration'
import NumericChoice from './NumericChoice/editor-registration'
import NumericAnswer from './NumericAnswer/editor-registration'

// register
Common.Registry.registerEditorModel(EditorNode)
Common.Registry.registerEditorModel(NumericChoice)
Common.Registry.registerEditorModel(NumericAnswer)
