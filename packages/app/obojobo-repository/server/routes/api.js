const router = require('express').Router() //eslint-disable-line new-cap
const insertEvent = require('obojobo-express/server/insert_event')
const Collection = require('../models/collection')
const CollectionSummary = require('../models/collection_summary')
const Draft = require('obojobo-express/server/models/draft')
const DraftSummary = require('../models/draft_summary')
const DraftPermissions = require('../models/draft_permissions')
const DraftsMetadata = require('../models/drafts_metadata')
const {
	requireCanPreviewDrafts,
	requireCurrentUser,
	requireCurrentDocument,
	checkValidationRules,
	requireCanCreateDrafts,
	requireCanDeleteDrafts,
	check,
	requireCanViewStatsPage
} = require('obojobo-express/server/express_validators')
const UserModel = require('obojobo-express/server/models/user')
const { searchForUserByString } = require('../services/search')
const { fetchAllCollectionsForDraft } = require('../services/collections')
const { getUserModuleCount } = require('../services/count')
const publicLibCollectionId = require('../../shared/publicLibCollectionId')

const {
	levelName,
	levelNumber,
	FULL,
	PARTIAL
} = require('../../../obojobo-express/server/constants')

const uuid = require('uuid').v4

// List public drafts
router.route('/drafts-public').get((req, res) => {
	return Collection.fetchById(publicLibCollectionId)
		.then(collection => collection.loadRelatedDrafts())
		.then(collection => {
			res.success(collection.drafts)
		})
		.catch(res.unexpected)
})

// List my collections
// mounted as /api/collections
router
	.route('/collections')
	.get([requireCurrentUser])
	.get((req, res) => {
		return CollectionSummary.fetchByUserId(req.currentUser.id)
			.then(collections => res.success(collections))
			.catch(res.unexpected)
	})

// List my recently modified drafts
// mounted as /api/recent/drafts
router
	.route('/recent/drafts')
	.get([requireCurrentUser, requireCanPreviewDrafts])
	.get((req, res) => {
		let allCount
		return getUserModuleCount(req.currentUser.id)
			.then(count => {
				allCount = count
				return DraftSummary.fetchRecentByUserId(req.currentUser.id)
			})
			.then(modules => {
				return res.success({ allCount, modules })
			})
			.catch(res.unexpected)
	})

// List my drafts
// mounted as /api/drafts
router
	.route('/drafts')
	.get([requireCurrentUser, requireCanPreviewDrafts])
	.get((req, res) => {
		let allCount
		return getUserModuleCount(req.currentUser.id)
			.then(count => {
				allCount = count
				return DraftSummary.fetchByUserId(req.currentUser.id)
			})
			.then(modules => {
				return res.success({ allCount, modules })
			})
			.catch(res.unexpected)
	})

router
	.route('/drafts-stats')
	.get([requireCurrentUser, requireCanViewStatsPage])
	.get((req, res) => {
		const canSeeAllModuleStats = req.currentUser.hasPermission('canViewSystemStats')

		if (canSeeAllModuleStats) {
			return DraftSummary.fetchAll()
				.then(res.success)
				.catch(res.unexpected)
		} else {
			return DraftSummary.fetchByUserId(req.currentUser.id)
				.then(res.success)
				.catch(res.unexpected)
		}
	})

router
	.route('/drafts-deleted')
	.get([requireCurrentUser, requireCanPreviewDrafts])
	.get((req, res) => {
		return DraftSummary.fetchDeletedByUserId(req.currentUser.id)
			.then(res.success)
			.catch(res.unexpected)
	})

router
	.route('/drafts/:draftId/revisions')
	.get([
		requireCurrentUser,
		requireCanPreviewDrafts,
		check('after')
			.isUUID()
			.optional(),
		checkValidationRules
	])
	.get(async (req, res) => {
		try {
			const { revisions, hasMoreResults } = await DraftSummary.fetchAllDraftRevisions(
				req.params.draftId,
				req.query.after
			)
			if (hasMoreResults) {
				const lastRevision = revisions[revisions.length - 1]
				const baseUrl = `${req.protocol}://${req.get('host')}`
				const pathUrl = req.originalUrl.split('?').shift()
				res.links({
					next: `${baseUrl}${pathUrl}?after=${lastRevision.revisionId}`
				})
			}
			return res.success(revisions)
		} catch (error) {
			res.unexpected(error)
		}
	})

router
	.route('/drafts/:draftId/revisions/:revisionId')
	.get([
		requireCurrentUser,
		requireCanPreviewDrafts,
		check('revisionId').isUUID(),
		checkValidationRules
	])
	.get((req, res) => {
		return DraftSummary.fetchDraftRevisionById(req.params.draftId, req.params.revisionId)
			.then(res.success)
			.catch(res.unexpected)
	})

router
	.route('/users/search')
	.get([requireCurrentUser, requireCanPreviewDrafts])
	.get(async (req, res) => {
		// empty search string? return empty array
		if (!req.query.q || !req.query.q.trim()) {
			res.success([])
			return
		}
		try {
			const users = await searchForUserByString(req.query.q)
			const filteredUsers = users.map(u => u.toJSON())
			res.success(filteredUsers)
		} catch (error) {
			res.unexpected(error)
		}
	})

// Copy a draft to the current user
// mounted as /api/drafts/:draftId/copy
router
	.route('/drafts/:draftId/copy')
	.post([requireCanPreviewDrafts, requireCurrentUser, requireCurrentDocument])
	.post(async (req, res) => {
		try {
			const userId = req.currentUser.id
			const draftId = req.currentDocument.draftId

			const readOnly = req.body.readOnly

			const canCopy = await DraftPermissions.userHasPermissionToCopy(req.currentUser, draftId)
			if (!canCopy) {
				res.notAuthorized('Current user has no permissions to copy this draft')
				return
			}

			const oldDraft = await Draft.fetchById(draftId)

			// gather all of the node IDs in the document and determine a new ID to replace each with
			const idsForChange = {}

			// this should never not exist, but just in case
			if (oldDraft.nodesById) {
				// only generate a replacement for ids that are UUIDs, not custom
				const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
				oldDraft.nodesById.forEach((node, key) => {
					if (key && uuidRegex.test(key)) idsForChange[key] = uuid()
				})
			}

			// now convert the updated document to an object for use
			const draftObject = oldDraft.root.toObject()

			const newTitle = req.body.title ? req.body.title : draftObject.content.title + ' Copy'
			draftObject.content.title = newTitle

			// convert the object to a JSON string so we can swap out all the old IDs with the new ones
			let draftString = JSON.stringify(draftObject)

			// globally replace each old ID with the equivalent new ID
			// this should replace node IDs as well as action trigger references to those node IDs
			for (const [oldId, newId] of Object.entries(idsForChange)) {
				// this works, but there may be a more efficient way of doing it
				draftString = draftString.replace(new RegExp(oldId, 'g'), newId)
			}

			const newDraftObject = JSON.parse(draftString)

			// const newDraft = await Draft.createWithContent(userId, draftObject)
			const newDraft = await Draft.createWithContent(userId, newDraftObject)

			const copiedDraftMetadata = new DraftsMetadata({
				draft_id: newDraft.id,
				key: 'copied',
				value: draftId
			})

			let readOnlyDraftMetadata = null

			if (readOnly) {
				readOnlyDraftMetadata = new DraftsMetadata({
					draft_id: newDraft.id,
					key: 'read_only',
					value: true
				})
			}

			await Promise.all([
				copiedDraftMetadata.saveOrCreate(),
				readOnlyDraftMetadata ? readOnlyDraftMetadata.saveOrCreate() : Promise.resolve(),
				insertEvent({
					actorTime: 'now()',
					action: 'draft:copy',
					userId,
					ip: req.connection.remoteAddress,
					metadata: {},
					payload: { from: draftId },
					draftId: newDraft.id,
					contentId: newDraft.content.id,
					eventVersion: '1.0.0',
					isPreview: false,
					visitId: req.body.visitId
				})
			])

			res.success({ draftId: newDraft.id })
		} catch (e) {
			res.unexpected(e)
		}
	})

// check for any changes to the draft's original
router
	.route('/drafts/:draftId/sync')
	.get([requireCurrentUser, requireCurrentDocument, requireCanCreateDrafts])
	.get((req, res) => {
		DraftsMetadata.getByDraftIdAndKey(req.currentDocument.draftId, 'copied')
			.then(md => {
				return DraftSummary.fetchByIdMoreRecentThan(md.value, md.updatedAt)
			})
			.then(mostRecentOriginalRevision => {
				res.success(mostRecentOriginalRevision)
			})
			.catch(e => {
				res.unexpected(e)
			})
	})

// replace a read-only draft's draft_content with its parent's most recent draft_content
router
	.route('/drafts/:draftId/sync')
	.patch([requireCurrentUser, requireCurrentDocument, requireCanCreateDrafts])
	.patch((req, res) => {
		let copyMeta = null

		DraftsMetadata.getByDraftIdAndKey(req.currentDocument.draftId, 'copied')
			.then(async md => {
				const userAccess = await DraftPermissions.getUserAccessLevelToDraft(
					req.currentUser.id,
					req.currentDocument.draftId
				)

				if (!(userAccess === FULL || userAccess === PARTIAL)) {
					res.notAuthorized('Current User does not have permission to share this draft')
					return
				}

				copyMeta = md
				// use original draft ID from the copy metadata
				const oldDraft = await Draft.fetchById(md.value)
				const draftObject = oldDraft.root.toObject()
				const newTitle = req.body.title ? req.body.title : draftObject.content.title + ' Copy'
				draftObject.content.title = newTitle
				return Draft.updateContent(req.currentDocument.draftId, req.currentUser.id, draftObject)
			})
			.then(() => {
				copyMeta.saveOrCreate()
				res.success()
			})
			.catch(e => {
				res.unexpected(e)
			})
	})

// list a draft's permissions
router
	.route('/drafts/:draftId/permission')
	.get([requireCurrentUser, requireCurrentDocument, requireCanPreviewDrafts])
	.get((req, res) => {
		return DraftPermissions.getDraftOwners(req.currentDocument.draftId)
			.then(users => {
				const filteredUsers = users.map(u => u.toJSON())
				res.success(filteredUsers)
			})
			.catch(res.unexpected)
	})

// add a permission for a user to a draft
router
	.route('/drafts/:draftId/permission')
	.post([requireCurrentUser, requireCurrentDocument])
	.post(async (req, res) => {
		try {
			const userId = req.body.userId
			const draftId = req.currentDocument.draftId

			// check currentUser's permissions
			const canShare =
				(await DraftPermissions.getUserAccessLevelToDraft(req.currentUser.id, draftId)) === FULL
			if (!canShare) {
				res.notAuthorized('Current User does not have permission to share this draft')
				return
			}

			// make sure the target userId exists
			// fetchById will throw if not found
			await UserModel.fetchById(userId)

			// add permissions
			await DraftPermissions.addOwnerToDraft(draftId, userId)
			res.success()
		} catch (error) {
			res.unexpected(error)
		}
	})

// update a user's access level
router
	.route('/drafts/:draftId/permission/update')
	.post([requireCurrentUser, requireCurrentDocument])
	.post(async (req, res) => {
		try {
			const userId = req.body.userId
			const draftId = req.currentDocument.draftId
			const targetLevel = req.body.accessLevel

			// check currentUser's permissions
			const canShare =
				(await DraftPermissions.getUserAccessLevelToDraft(req.currentUser.id, draftId)) === FULL
			if (!canShare) {
				res.notAuthorized('Current User does not have permission to share this draft')
				return
			}

			// Guard against invalid access levels
			if (!levelNumber[targetLevel]) {
				const msg = 'Invalid access level: ' + targetLevel
				res.status(400).send(msg)
				return
			}

			// check if same access level
			const currentLevel = await DraftPermissions.getUserAccessLevelToDraft(
				req.body.userId,
				draftId
			)

			if (levelName[currentLevel] === targetLevel) {
				res.success()
				return
			}

			// make sure the target userId exists
			// fetchById will throw if not found
			await UserModel.fetchById(userId)

			// add permissions
			await DraftPermissions.updateAccessLevel(draftId, userId, levelNumber[targetLevel])
			res.success()
		} catch (error) {
			res.unexpected(error)
		}
	})

// delete a permission for a user to a draft
router
	.route('/drafts/:draftId/permission/:userId')
	.delete([requireCurrentUser, requireCurrentDocument])
	.delete(async (req, res) => {
		try {
			const userIdToRemove = req.params.userId
			const draftId = req.currentDocument.draftId

			// check currentUser's permissions
			const canShare =
				(await DraftPermissions.getUserAccessLevelToDraft(req.currentUser.id, draftId)) === FULL
			if (!canShare) {
				res.notAuthorized('Current User has no permissions to selected draft')
				return
			}

			// make sure the userToRemove exists
			// fetchById throws when not found
			const userToRemove = await UserModel.fetchById(userIdToRemove)

			// remove perms
			await DraftPermissions.removeOwnerFromDraft(draftId, userToRemove.id)
			res.success()
		} catch (error) {
			res.unexpected(error)
		}
	})

// list the collections a draft is in
router
	.route('/drafts/:draftId/collections')
	.get([requireCurrentUser, requireCurrentDocument, requireCanPreviewDrafts])
	.get((req, res) => {
		return fetchAllCollectionsForDraft(req.currentDocument.draftId)
			.then(res.success)
			.catch(res.unexpected)
	})

// list the modules a collection has
router
	.route('/collections/:collectionId/modules')
	.get([requireCurrentUser, requireCanPreviewDrafts])
	.get((req, res) => {
		let allCount
		return getUserModuleCount(req.currentUser.id)
			.then(count => {
				allCount = count
				return DraftSummary.fetchAllInCollectionForUser(req.params.collectionId, req.currentUser.id)
			})
			.then(modules => {
				return res.success({ allCount, modules })
			})
			.catch(res.unexpected)
	})

router
	.route('/collections/:collectionId/modules/search')
	.get([requireCurrentUser, requireCanPreviewDrafts])
	.get((req, res) => {
		// empty search string? return empty array
		if (!req.query.q || !req.query.q.trim()) {
			res.success([])
			return
		}

		let allCount
		return getUserModuleCount(req.currentUser.id)
			.then(count => {
				allCount = count
				return DraftSummary.fetchByDraftTitleAndUser(req.query.q, req.currentUser.id)
			})
			.then(modules => {
				return res.success({ allCount, modules })
			})
			.catch(res.unexpected)
	})

// Create a Collection
// mounted as /api/collections/new
router
	.route('/collections/new')
	.post([requireCanCreateDrafts, checkValidationRules])
	.post((req, res) => {
		return Collection.createWithUser(req.currentUser.id)
			.then(res.success)
			.catch(res.unexpected)
	})

// Rename a Collection
// mounted as /api/collections/rename
router
	.route('/collections/rename')
	.post([requireCanCreateDrafts, checkValidationRules])
	.post(async (req, res) => {
		try {
			const hasPerms = await DraftPermissions.userHasPermissionToCollection(
				req.currentUser.id,
				req.body.id
			)
			if (!hasPerms) {
				return res.notAuthorized('You must be the creator of this collection to rename it')
			}
			const collection = await Collection.rename(req.body.id, req.body.title, req.currentUser.id)
			res.success(collection)
		} catch (error) {
			res.unexpected(error)
		}
	})

// Delete a collection
// mounted as api/collections/:id
router
	.route('/collections/:id')
	.delete([requireCanDeleteDrafts, checkValidationRules])
	.delete(async (req, res) => {
		try {
			const hasPerms = await DraftPermissions.userHasPermissionToCollection(
				req.currentUser.id,
				req.params.id
			)
			if (!hasPerms) {
				return res.notAuthorized('You must be the creator of this collection to delete it')
			}

			const collection = await Collection.delete(req.params.id, req.currentUser.id)
			res.success(collection)
		} catch (error) {
			res.unexpected(error)
		}
	})

// Add a module to a collection
// mounted as api/collections/:id/modules/add
router
	.route('/collections/:id/modules/add')
	.post([requireCanCreateDrafts, checkValidationRules])
	.post(async (req, res) => {
		try {
			const hasPerms = await DraftPermissions.userHasPermissionToCollection(
				req.currentUser.id,
				req.params.id
			)
			if (!hasPerms) {
				return res.notAuthorized('You must be the creator of this collection to add modules to it')
			}

			const collection = await Collection.addModule(
				req.params.id,
				req.body.draftId,
				req.currentUser.id
			)
			res.success(collection)
		} catch (error) {
			res.unexpected(error)
		}
	})

// Remove a module from a collection
// mounted as api/collections/:id/modules/remove
router
	.route('/collections/:id/modules/remove')
	.delete([requireCanDeleteDrafts, checkValidationRules])
	.delete(async (req, res) => {
		try {
			const hasPerms = await DraftPermissions.userHasPermissionToCollection(
				req.currentUser.id,
				req.params.id
			)
			if (!hasPerms) {
				return res.notAuthorized(
					'You must be the creator of this collection to remove modules from it'
				)
			}

			const collection = await Collection.removeModule(
				req.params.id,
				req.body.draftId,
				req.currentUser.id
			)
			res.success(collection)
		} catch (error) {
			res.unexpected(error)
		}
	})

module.exports = router
