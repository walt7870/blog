import org.gradle.api.DefaultTask
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.CacheableTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction

plugins {
    java
}

group = "example.orders"
version = "1.0.0-SNAPSHOT"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release.set(17)
    options.encoding = "UTF-8"
}

dependencies {
    testImplementation(platform("org.junit:junit-bom:5.10.2"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}

@CacheableTask
abstract class WriteBuildInfo : DefaultTask() {
    @get:Input
    abstract val releaseName: Property<String>

    @get:OutputFile
    abstract val destination: RegularFileProperty

    @TaskAction
    fun writeInfo() {
        val name = releaseName.get()
        require(name.matches(Regex("[A-Za-z0-9._-]+")))
        val output = destination.get().asFile
        output.parentFile.mkdirs()
        output.writeText("release=$name\n", Charsets.UTF_8)
    }
}

val writeBuildInfo = tasks.register<WriteBuildInfo>("writeBuildInfo") {
    releaseName.set(providers.gradleProperty("buildVersion").orElse("1.0.0"))
    destination.set(layout.buildDirectory.file("generated/build-info/build-info.properties"))
}

tasks.processResources {
    from(writeBuildInfo)
}
