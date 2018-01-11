let DraftNode = oboRequire('models/draft_node')
let db = oboRequire('db')
let express = require('express')
let app = express()

class Assessment extends DraftNode {
	static getCompletedAssessmentAttemptHistory(
		userId,
		draftId,
		assessmentId,
		includePreviewAttempts
	) {
		let previewSql = includePreviewAttempts ? '' : 'AND preview = FALSE'

		return db.manyOrNone(
			`
				SELECT
					id AS "attemptId",
					created_at as "startTime",
					completed_at as "endTime",
					assessment_id as "assessmentId",
					state,
					result
				FROM attempts
				WHERE
					user_id = $[userId]
					AND draft_id = $[draftId]
					AND assessment_id = $[assessmentId]
					AND completed_at IS NOT NULL
					${previewSql}
				ORDER BY completed_at DESC`,
			{ userId: userId, draftId: draftId, assessmentId: assessmentId }
		)
	}

	static getNumberAttemptsTaken(userId, draftId, assessmentId) {
		return db
			.one(
				`
				SELECT
					COUNT(*)
				FROM attempts
				WHERE
					user_id = $[userId]
					AND draft_id = $[draftId]
					AND assessment_id = $[assessmentId]
					AND completed_at IS NOT NULL
					AND preview = false
			`,
				{ userId: userId, draftId: draftId, assessmentId: assessmentId }
			)
			.then(result => {
				return parseInt(result.count, 10)
			})
	}

	// @TODO: most things touching the db should end up in models. figure this out
	static getAttemptHistory(userId, draftId) {
		return db.manyOrNone(
			`
				SELECT
					id AS "attemptId",
					created_at as "startTime",
					completed_at as "endTime",
					assessment_id as "assessmentId",
					state,
					result
				FROM attempts
				WHERE
					user_id = $[userId]
					AND draft_id = $[draftId]
					AND preview = FALSE
				ORDER BY completed_at DESC`,
			{ userId: userId, draftId: draftId }
		)
	}

	static getAssessmentScore(userId, draftId, assessmentId) {
		return db
			.manyOrNone(
				`
				SELECT *
				FROM assessment_scores
				WHERE
					user_id = $[userId]
					AND draft_id = $[draftId]
					AND assessment_id = $[assessmentId]
					AND preview = FALSE
				ORDER BY completed_at DESC LIMIT 1
			`
			)
			.then(result => {
				if (typeof result === undefined) return null
				return result.score
			})
	}

	static insertNewAttempt(userId, draftId, assessmentId, state, isPreview) {
		return db.one(
			`
				INSERT INTO attempts (user_id, draft_id, assessment_id, state, preview)
				VALUES($[userId], $[draftId], $[assessmentId], $[state], $[isPreview])
				RETURNING
				id AS "attemptId",
				created_at as "startTime",
				completed_at as "endTime",
				assessment_id as "assessmentId",
				state,
				result
			`,
			{
				userId: userId,
				draftId: draftId,
				assessmentId: assessmentId,
				state: state,
				isPreview: isPreview
			}
		)
	}

	static insertAssessmentScore(userId, draftId, assessmentId, launchId, score, isPreview) {
		return db.one(
			`
				INSERT INTO assessment_scores (user_id, draft_id, assessment_id, launch_id, score preview)
				VALUES($[userId], $[draftId], $[assessmentId], $[launchId], $[score], $[isPreview])
				RETURNING id
			`,
			{
				userId,
				draftId,
				assessmentId,
				launchId,
				score,
				isPreview
			}
		)
	}

	// @TODO: most things touching the db should end up in models. figure this out

	// Finish an attempt and write a new assessment score record
	static completeAttempt(assessmentId, attemptId, userId, draftId, calculatedScores, preview) {
		return db
			.tx(t => {
				const q1 = db.one(
					`
					UPDATE attempts
					SET
						completed_at = now(),
						result = $[result]
					WHERE id = $[attemptId]
					RETURNING
						id AS "attemptId",
						created_at as "startTime",
						completed_at as "endTime",
						assessment_id as "assessmentId",
						state,
						result as "scores"
				`,
					{ result: calculatedScores, attemptId: attemptId }
				)

				const q2 = db.one(
					`
					INSERT INTO assessment_scores (user_id, draft_id, assessment_id, attempt_id, score, preview)
					VALUES($[userId], $[draftId], $[assessmentId], $[attemptId], $[score], $[preview])
					RETURNING id
				`,
					{
						userId,
						draftId,
						assessmentId,
						attemptId,
						score: calculatedScores.assessmentScore,
						preview
					}
				)

				return t.batch([q1, q2])
			})
			.then(result => {
				return {
					attemptData: result[0],
					assessmentScoreId: result[1].id
				}
			})
	}

	static insertNewAssessmentScore(userId, draftId, assessmentId, score, preview) {
		return db
			.one(
				`
				INSERT INTO assessment_scores (user_id, draft_id, assessment_id, score, preview)
				VALUES($[userId], $[draftId], $[assessmentId], $[score], $[preview])
				RETURNING id
			`,
				{
					userId,
					draftId,
					assessmentId,
					score,
					preview
				}
			)
			.then(result => result.id)
	}

	constructor(draftTree, node, initFn) {
		super(draftTree, node, initFn)
		this.registerEvents({
			'internal:sendToClient': this.onSendToClient,
			'internal:renderViewer': this.onRenderViewer
		})
	}

	onSendToClient(req, res) {
		return this.yell('ObojoboDraft.Sections.Assessment:sendToClient', req, res)
	}

	onRenderViewer(req, res, oboGlobals) {
		return req
			.requireCurrentUser()
			.then(currentUser => {
				return this.constructor.getAttemptHistory(currentUser.id, req.params.draftId)
			})
			.then(attemptHistory => {
				oboGlobals.set('ObojoboDraft.Sections.Assessment:attemptHistory', attemptHistory)
				return Promise.resolve()
			})
			.catch(err => {
				return Promise.reject(err)
			})
	}
}

module.exports = Assessment
