module.exports = {
    dependencies: {
        // These libraries do not support New Architecture C++ codegen.
        // Exclude from native autolinking entirely — they are manually
        // linked in settings.gradle and app/build.gradle.
        '@bam.tech/react-native-image-resizer': {
            platforms: {
                android: null,
            },
        },
        '@react-native-community/blur': {
            platforms: {
                android: null,
            },
        },
    },
};
