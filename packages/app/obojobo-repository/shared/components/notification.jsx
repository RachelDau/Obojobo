const React = require('react')
require('./notification.scss')

const Notification = () => {
	const [notifications, setNotifications] = React.useState([])

	React.useEffect(() => {
		if (document && document.cookie) {
			const cookiePropsRaw = decodeURIComponent(document.cookie).split(';')

			let parsedValue
			cookiePropsRaw.forEach(c => {
				const parts = c.trim().split('=')
				if (parts[0] === 'notifications') {
					parsedValue = JSON.parse(parts[1])
				}
			})

			const parsedNotifications = parsedValue
			setNotifications(parsedNotifications)
		} else {
			// there is nothing to render
		}
	}, [])

	function onClickExitNotification(key) {
		setNotifications(prevNotifications => prevNotifications.filter((_, index) => index !== key))
	}

	React.useEffect(() => {
		const jsonNotifications = JSON.stringify(notifications)
		const cookieString = `${encodeURIComponent(jsonNotifications)};`
		document.cookie = 'notifications=' + cookieString
	}, [notifications])

	const renderNotification = (key, text, title) => {
		return (
			<div className={`notification-banner`} key={key}>
				<div className="notification-header">
					<h1>{title}</h1>
					<button onClick={() => onClickExitNotification(key)} className="notification-exit-button">
						x
					</button>
				</div>
				<p>{text}</p>
			</div>
		)
	}

	if (notifications && notifications.length >= 1) {
		return (
			<div className="notification-wrapper">
				{notifications.map((notification, key) =>
					renderNotification(key, notification.text, notification.title)
				)}
			</div>
		)
	} else {
		return null
	}
}

module.exports = Notification
