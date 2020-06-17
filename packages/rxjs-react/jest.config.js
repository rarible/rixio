module.exports = {
  setupFilesAfterEnv: ["@testing-library/jest-dom/extend-expect"],
  "roots": [
    "<rootDir>/src",
    "<rootDir>/test",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
}
