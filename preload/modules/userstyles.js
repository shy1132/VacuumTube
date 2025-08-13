//custom CSS styles

const { ipcRenderer } = require('electron')
const configManager = require('../config')
const functions = require('../util/functions')
const css = require('../util/css')

let config = configManager.get()

const injected = new Set()

function injectCSS(filename, text) {
	const id = getId(filename)
	injected.add(id)
	css.inject(id, text)
	console.log(`[Userstyles] Injected: ${id}`)
}

function removeCSS(identifier, isFileName) {
	let id = identifier;
	if (isFileName) {
		id = getId(identifier)
	}

	injected.delete(id)
	css.delete(id)
	console.log(`[Userstyles] Removed: ${id}`)
}

async function loadUserstyles() {
	if (!config.userstyles) {
		console.log('[Userstyles] Disabled in config')
		return;
	}

	try {
		const styles = await ipcRenderer.invoke('get-userstyles')

		styles.forEach(({ filename, css }) => {
			injectCSS(filename, css)
		})

		console.log(`[Userstyles] Loaded ${styles.length} stylesheets`)
	} catch (error) {
		console.error('[Userstyles] Failed to load styles:', error)
	}
}

function getId(filename) {
	let filenameNoExt = filename.slice(0, -('.css'.length))
	let cleanFilename = filenameNoExt.replace(/[^a-zA-Z0-9]/g, '-')
	return `userstyle-${cleanFilename}`;
}

module.exports = async () => {
	await functions.waitForCondition(() => !!document.head)

	console.log('[Userstyles] Initializing...')

	await loadUserstyles()

	ipcRenderer.on('config-update', (event, newConfig) => {
		const wasEnabled = config.userstyles;
		config = newConfig;

		if (config.userstyles && !wasEnabled) {
			loadUserstyles()
		} else if (!config.userstyles && wasEnabled) {
			injected.forEach((id) => {
				removeCSS(id)
			})
		}
	})

	ipcRenderer.on('userstyle-updated', (event, { filename, css }) => {
		if (config.userstyles) {
			injectCSS(filename, css)
		}
	})

	ipcRenderer.on('userstyle-removed', (event, { filename }) => {
		const id = getId(filename)
		removeCSS(id, true)
	})

	console.log('[Userstyles] Initialized')
}