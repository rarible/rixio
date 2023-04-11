import path from "path"
import { merge } from "webpack-merge"

const rootPath = path.resolve(__dirname, "..")

export default ({ config }) => {
	return merge(config, {
		module: {
			rules: [
				{
					test: /\.(ts|tsx)$/,
					use: [
						{
							loader: require.resolve("ts-loader"),
							options: {
								transpileOnly: true,
								configFile: path.resolve(rootPath, "tsconfig.json"),
							},
						},
					],
				},
			],
		},
		resolve: {
			extensions: [".tsx", ".ts"],
		},
	})
}
