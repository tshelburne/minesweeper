import React, {useReducer} from 'react'
import cx from 'classnames'
import ReactDOM from 'react-dom'
import memoize from 'memoizee'

import 'normalize.css'
import './_styles/app.css'

// SETTINGS

const BOMB_PCT = .1
const GRID_SIZE = 15

// STATE

const RESET = Symbol(`reset`)
const LEFT_CLICK = Symbol(`left click`)
const RIGHT_CLICK = Symbol(`right click`)

function leftClick(tile) {
	return {type: LEFT_CLICK, data: {tile}}
}

function rightClick(tile) {
	return {type: RIGHT_CLICK, data: {tile}}
}

function reset() {
	return {type: RESET, data: {tiles: initTiles(GRID_SIZE, BOMB_PCT)}}
}

function reducer(state, action) {
	switch (action.type) {
		case LEFT_CLICK: {
			if (action.data.tile.flagged) return state
			const {tile} = action.data

			const toExpose = !tile.bomb && bombsAround(state.tiles, tile).length === 0
				? zerosPatch(state.tiles, tile)
				: [tile]
			const tiles = state.tiles.map((t) => toExpose.includes(t) ? {...t, exposed: true} : t)
			return {...state, tiles}
		}

		case RIGHT_CLICK: {
			if (action.data.tile.exposed) return state

			const tiles = state.tiles.map((t) => t === action.data.tile ? {...t, flagged: !t.flagged} : t)
			return {...state, tiles}
		}

		case RESET:
			return {...state, tiles: action.data.tiles}

		default:
			return state
	}
}

function initTiles(gridSize, bombPct) {
	return Array.from({length: gridSize * gridSize}).map(() => ({
		exposed: false,
		flagged: false,
		bomb: Math.random() < bombPct,
	}))
}

// UI

const Game = ({initialState}) => {
	const [state, dispatch] = useReducer(reducer, initialState)
	const flagged = state.tiles.filter(({flagged}) => flagged)
	const bombs = state.tiles.filter(({bomb}) => bomb)
	const lost = bombs.some(({exposed}) => exposed)
	const won = !lost && state.tiles.every(({exposed, bomb}) => exposed || bomb)

	return <React.Fragment>
		{!won && !lost && <h1>Playing...</h1>}
		{won && <h1>YOU WON!</h1>}
		{lost && <h1>YOU SUCK!</h1>}
		<button onClick={() => dispatch(reset())}>Reset</button>
		<h2>{flagged.length} / {bombs.length} bombs flagged</h2>
		<div className={cx(`grid`, {won, lost})}>
			{state.tiles.map((tile, i) =>
				<div key={i} className={cx(`tile`, {exposed: tile.exposed, bomb: tile.bomb})}>
					{tile.exposed && !tile.bomb && bombsAround(state.tiles, tile).length || ``}
					{!tile.exposed &&
						<input
							type="checkbox"
							disabled={won || lost}
							checked={tile.flagged}
							onClick={() => dispatch(leftClick(tile))}
							onContextMenu={preventDefault(() => dispatch(rightClick(tile)))}
						/>
					}
				</div>
			)}
		</div>
	</React.Fragment>
}

// MAIN

function main() {
	document.documentElement.style.setProperty(`--grid-size`, GRID_SIZE)

	ReactDOM.render(
		<Game initialState={{tiles: initTiles(GRID_SIZE, BOMB_PCT)}} />,
		document.getElementById(`app`)
	)
}

// DOMAIN HELPERS

const tilesAround = memoize(function(tiles, tile, cross = false) {
	const index = tiles.indexOf(tile)
	const side = Math.sqrt(tiles.length)
	const onTop = index < side
	const onBtm = index >= (tiles.length - side)
	const onLft = index % side === 0
	const onRit = (index + 1) % side === 0

	return [
			!onTop && !onLft && !cross && -(side+1), !onTop && -side,  !onTop && !onRit && !cross && -(side-1),
			!onLft && -1,                            /* TILE */      !onRit && 1,
			!onBtm && !onLft && !cross &&  side-1,   !onBtm && side, !onBtm && !onRit && !cross && side+1,
		]
		.filter(value => !!value)
		.map((diff) => tiles[index + diff])
}, {length: 3})

function bombsAround(...args) {
	return tilesAround(...args).filter(({bomb}) => bomb)
}

function zerosAround(...args) {
	return tilesAround(...args).filter((t) => bombsAround(args[0], t).length === 0)
}

function zerosPatch(tiles, tile, matches = [], remaining = [], checked = []) {
	const blacklist = [...matches, ...remaining, ...checked]
	const [next, ...rest] = zerosAround(tiles, tile, true).filter(t => !blacklist.includes(t))

	const allMatches = tile.bomb || bombsAround(tiles, tile).length > 0 ? matches : [...matches, tile]
	const allRemaining = [...remaining, ...rest]
	const allChecked = [...checked, tile]

	if (next) return zerosPatch(tiles, next, allMatches, allRemaining, allChecked)
	if (allRemaining.length > 0) return zerosPatch(tiles, allRemaining[0], allMatches, allRemaining.slice(1), allChecked)

	return allMatches
}

// UTIL HELPERS

function preventDefault(fn) {
	return (e) => {
		e.preventDefault()
		return fn(e)
	}
}

// BOOTSTRAP

main()