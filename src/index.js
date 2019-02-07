import React, {useReducer, useEffect} from 'react'
import cx from 'classnames'
import ReactDOM from 'react-dom'
import memoize from 'memoizee'

import 'normalize.css'
import './_styles/app.css'

// SETTINGS

const INITIAL_DIFFICULTY = `easy`

const LEVELS = {
	easy: {size: 10, bombPct: .1},
	medium: {size: 15, bombPct: .25},
	hard: {size: 20, bombPct: .3},
	nuts: {size: 30, bombPct: .5},
}

// STATE

const RESET = Symbol(`reset`)
const LEFT_CLICK = Symbol(`left click`)
const RIGHT_CLICK = Symbol(`right click`)

function reset(name) {
	return {type: RESET, data: {name, tiles: initTiles(LEVELS[name])}}
}

function leftClick(tile) {
	return {type: LEFT_CLICK, data: {tile}}
}

function rightClick(tile) {
	return {type: RIGHT_CLICK, data: {tile}}
}

function reducer(state, action) {
	switch (action.type) {
		case RESET:
			return {...state, difficulty: action.data.name, tiles: action.data.tiles}

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

		default:
			return state
	}
}

function initTiles({size, bombPct}) {
	return Array.from({length: size * size}).map(() => ({
		exposed: false,
		flagged: false,
		bomb: Math.random() < bombPct,
	}))
}

// UI

const Game = ({initialState}) => {
	const [{difficulty, tiles}, dispatch] = useReducer(reducer, initialState)
	const level = LEVELS[difficulty]
	useEffect(() => {
		document.documentElement.style.setProperty(`--grid-size`, level.size)
	})

	const flagged = tiles.filter(({flagged}) => flagged)
	const bombs = tiles.filter(({bomb}) => bomb)
	const lost = bombs.some(({exposed}) => exposed)
	const won = !lost && tiles.every(({exposed, bomb}) => exposed || bomb)

	return <React.Fragment>
		{!won && !lost && <h1>Playing...</h1>}
		{won && <h1>YOU WON!</h1>}
		{lost && <h1>YOU SUCK!</h1>}
		<button onClick={() => dispatch(reset(difficulty))}>Reset</button>
		<select onChange={(e) => dispatch(reset(e.target.value))}>
			{Object.keys(LEVELS).map(name => <option value={name}>{name}</option>)}
		</select>
		<h2>{flagged.length} / {bombs.length} bombs flagged</h2>
		<div className={cx(`grid`, {won, lost})}>
			{tiles.map((tile, i) =>
				<div key={i} className={cx(`tile`, {exposed: tile.exposed, bomb: tile.bomb})}>
					{tile.exposed && !tile.bomb && bombsAround(tiles, tile).length || ``}
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
	ReactDOM.render(
		<Game initialState={{
			difficulty: INITIAL_DIFFICULTY,
			tiles: initTiles(LEVELS[INITIAL_DIFFICULTY]),
		}} />,
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

function zerosPatch(tiles, tile, matches = [], remaining = [], checked = []) {
	const blacklist = [...matches, ...remaining, ...checked]
	const allAround = tilesAround(tiles, tile).filter(t => !blacklist.includes(t))
	const [nextToBombs, [next, ...rest]] = split((t) => !!bombsAround(tiles, t).length, allAround)

	const allMatches = tile.bomb || bombsAround(tiles, tile).length > 0 ? [...matches, ...nextToBombs] : [...matches, ...nextToBombs, tile]
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

function split(fn, arr) {
	const matches = arr.filter(fn)
	const nonMatches = arr.filter(v => !matches.includes(v))
	return [matches, nonMatches]
}

// BOOTSTRAP

main()