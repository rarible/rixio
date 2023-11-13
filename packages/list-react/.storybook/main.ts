export default {
	stories: ["../src/**/*.stories.tsx"],
	framework: {
		name: "@storybook/react-webpack5",
		options: {},
	},
	docs: {
		autodocs: "tag",
	},
	features: {
		storyStoreV7: false,
		babelModeV7: true,
	},
	core: {
		disableTelemetry: true,
	},
	typescript: {
		check: false,
		checkOptions: {},
	},
}
