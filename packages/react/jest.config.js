module.exports = {
	setupFilesAfterEnv: ["@testing-library/jest-dom/extend-expect"],
	testEnvironment: "jsdom",
	roots: ["<rootDir>/src"],
	transform: {
		"^.+\\.tsx?$": "ts-jest",
	},
}
