/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

// We've set up this sample using CSS modules, which lets you import class
// names into JavaScript: https://github.com/css-modules/css-modules
// You can configure or change this in the webpack.config.js file.
import * as style from './style.css';
import type { RendererContext } from 'vscode-notebook-renderer';
const { parse } = require('ansicolor')

interface IRenderInfo {
	container: HTMLElement;
	mime: string;
	value: any;
	context: RendererContext<unknown>;
  }

// color codes from ansicolor
// const colorCodes      = [   'black',      'red',      'green',      'yellow',      'blue',      'magenta',      'cyan', 'lightGray', '', 'default']
//     , colorCodesLight = ['darkGray', 'lightRed', 'lightGreen', 'lightYellow', 'lightBlue', 'lightMagenta', 'lightCyan', 'white', '']

const nameMapping: { [key: string]: string } = {
	'black': '--theme-terminal-ansiBlack',
	'red': '--theme-terminal-ansiRed',
	'green': '--theme-terminal-ansiGreen',
	'yellow': '--theme-terminal-ansiYellow',
	'blue': '--theme-terminal-ansiBlue',
	'magenta': '--theme-terminal-ansiMagenta',
	'cyan': '--theme-terminal-ansiCyan',
	'white': '--theme-terminal-ansiWhite',
	'lightGray': '--theme-terminal-ansiWhite',
	'lightBlack': '--theme-terminal-ansiBrightBlack',
	'lightRed': '--theme-terminal-ansiBrightRed',
	'lightGreen': '--theme-terminal-ansiBrightGreen',
	'lightYellow': '--theme-terminal-ansiBrightYellow',
	'lightBlue': '--theme-terminal-ansiBrightBlue',
	'lightMagenta': '--theme-terminal-ansiBrightMagenta',
	'lightCyan': '--theme-terminal-ansiBrightCyan',
	'lightWhite': '--theme-terminal-ansiBrightWhite'
};

function updateColor(spanEl: HTMLSpanElement, span: any) {
	if (span.color) {
		const name = span.color.name;
		const cssVariable = nameMapping[name];
		spanEl.setAttribute('style', `color: var(${cssVariable});`);
	} else {
		spanEl.setAttribute('style', span.css);
	}
}

function attachFileLink(spanEl: HTMLSpanElement, text: string, fileName: string, lineNumber: number) {
	const aEl = document.createElement('a');
	aEl.href = `command:bje.revealrange?\"${fileName},${lineNumber}\"`;
	aEl.setAttribute('data-href', `command:bje.revealrange?\"${fileName},${lineNumber}\"`);
	aEl.title = 'Navigate to the cell';
	aEl.text = text;
	spanEl.appendChild(aEl);
}

function matchTraceback(traceback: string) {
	return /^\<ipython-input-(\d)/.test(traceback) || /(\~.*\.py)/.test(traceback);
}

function matchLineNumber(traceback: string) {
	const errorLineNumberMatches = /^\-{2,4}> (\d+)/.exec(traceback);
	if (errorLineNumberMatches && errorLineNumberMatches.length === 2) {
		return errorLineNumberMatches[1];
	}

	return null;
}

function renderTraceback(pre: HTMLElement, datas: string[]) {
	let fileName: string | null = null;
	datas.forEach((data) => {
		let parsedHTML: HTMLSpanElement[] = [document.createElement('span')];
		const ret = parse(data);
		ret.spans.forEach((span: any) => {
			if (span.text === '\n') {
				parsedHTML.push(document.createElement('span'));
				return;
			}

			const lastArr = parsedHTML[parsedHTML.length - 1];
			if (matchTraceback(span.text)) {
				fileName = span.text;
				const spanEl = document.createElement('span');
				updateColor(spanEl, span);
				attachFileLink(spanEl, span.text, span.text, 1);
				lastArr.appendChild(spanEl);
				return;
			}

			const errorLineNumber = matchLineNumber(span.text);
			if (errorLineNumber !== null) {
				const spanEl = document.createElement('span');
				updateColor(spanEl, span);
				attachFileLink(spanEl, span.text, fileName ?? '', Number(errorLineNumber));
				lastArr.appendChild(spanEl);
				return;
			}

			const spanEl = document.createElement('span');
			updateColor(spanEl, span);
			spanEl.textContent = span.text;
			lastArr.appendChild(spanEl);
		});

		parsedHTML.forEach(el => {
			pre.appendChild(el);
		});
	});
}

function renderErrorTitle(divEl: HTMLElement, ename: string, evalue: string) {
	if (ename === 'ModuleNotFoundError') {
		const moduleNameMatches = /No module named \'(\S+)\'/.exec(evalue);
		if (moduleNameMatches && moduleNameMatches.length) {
			const nameSpanEl = document.createElement('span');
			nameSpanEl.innerText = `${ename}: `;
			divEl.appendChild(nameSpanEl);

			const moduleName = moduleNameMatches[1];
			const aEl = document.createElement('a');
			aEl.href = `command:bje.installModule?\"${moduleName}\"`;
			aEl.setAttribute('data-href', `command:bje.installModule?\"${moduleName}\"`);
			aEl.title = 'Install Module ' + moduleName;
			aEl.text = evalue;
			const valueSpanEl = document.createElement('span');
			valueSpanEl.appendChild(aEl);
			divEl.appendChild(valueSpanEl);
			return;
		}
	}

	const errorMessage = `${ename}: ${evalue}`;
	divEl.innerText = errorMessage;
	divEl.style.color = `var(--vscode-editorError-foreground)`;
}

function renderExpandButton(divEl: HTMLElement, tracebackEl: HTMLElement) {
	const button = document.createElement('button');
	divEl.appendChild(button);
	button.classList.add(style.showTraceback);
	button.textContent = 'Show Error Details'
	button.onclick = () => {
		if (tracebackEl.classList.contains(style.hiddenTraceback)) {
			button.textContent = 'Hide Error Details'
			tracebackEl.classList.remove(style.hiddenTraceback);
			tracebackEl.classList.add(style.visibleTraceback);
		} else {
			button.textContent = 'Show Error Details'
			tracebackEl.classList.add(style.hiddenTraceback);
			tracebackEl.classList.remove(style.visibleTraceback);
		}
	};
}

// This function is called to render your contents.
export function render({ container, mime, value }: IRenderInfo) {
	const divEl = document.createElement('div');
	container.appendChild(divEl);
	const expandEl = document.createElement('div');
	expandEl.style.marginTop = '8px';
	container.appendChild(expandEl);
	const pre = document.createElement('pre');
	container.appendChild(pre);

	renderErrorTitle(divEl, value.name, value.message);
	renderExpandButton(expandEl, pre);
	pre.classList.add(style.json);
	pre.classList.add(style.hiddenTraceback)
	renderTraceback(pre, value.stack ? value.stack.split(/\r\n|\r|\n/) : []);
}

if (module.hot) {
	module.hot.addDisposeHandler(() => {
		// In development, this will be called before the renderer is reloaded. You
		// can use this to clean up or stash any state.
	});
}
