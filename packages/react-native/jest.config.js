module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: [
		"@testing-library/jest-native/extend-expect",
		"./jest-setup.js",
	],
  "roots": [
    "<rootDir>/src",
  ],
  transform: {
		"^.+\\.tsx?$": "ts-jest",
		"\\.js$": "<rootDir>/../../node_modules/react-native/jest/preprocessor.js",
	},
	globals: {
		"ts-jest": {
			babelConfig: true,
		},
	},
}
