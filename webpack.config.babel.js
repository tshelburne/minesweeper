import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import CleanWebpackPlugin from 'clean-webpack-plugin'

export default {
	module: {
		rules: [
			{ test: /\.js$/, exclude: /node_modules/, loader: `babel-loader` },
			{
				test: /\.css$/,
				use: [
					`style-loader`,
					`css-loader`
				]
			},
		]
	},
	externals: {
    config: `config`,
  },
	plugins: [
		new HtmlWebpackPlugin({template: `./src/index.html`}),
		new CleanWebpackPlugin([`public`]),
	]
}