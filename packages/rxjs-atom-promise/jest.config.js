module.exports = {
  setupFilesAfterEnv: ["@testing-library/jest-dom/extend-expect"],
  "roots": [
    "<rootDir>/src",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
}
