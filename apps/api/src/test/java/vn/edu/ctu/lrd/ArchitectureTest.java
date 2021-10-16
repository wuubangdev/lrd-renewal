package vn.edu.ctu.lrd;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;

import org.junit.jupiter.api.Test;

class ArchitectureTest {
    private final com.tngtech.archunit.core.domain.JavaClasses classes =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("vn.edu.ctu.lrd");

    @Test
    void domainAndUseCasesStayIndependentFromFrameworksAndAdapters() {
        noClasses()
                .that()
                .resideInAnyPackage("..domain..", "..application..")
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage(
                        "org.springframework..",
                        "jakarta..",
                        "..adapters..",
                        "..configuration..",
                        "software.amazon..",
                        "tools.jackson..")
                .check(classes);
    }

    @Test
    void modulesHaveNoDependencyCycles() {
        slices().matching("vn.edu.ctu.lrd.(*)..").should().beFreeOfCycles().check(classes);
    }

    @Test
    void crossDomainCallsUsePublishedModuleApis() {
        for (String module :
                new String[] {
                    "identity", "publishing", "media", "site", "discovery", "academics", "integrations", "directory", "editorial", "research"
                }) {
            noClasses()
                    .that()
                    .resideOutsideOfPackage("vn.edu.ctu.lrd." + module + "..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAnyPackage(
                            "vn.edu.ctu.lrd." + module + ".domain..",
                            "vn.edu.ctu.lrd." + module + ".application..",
                            "vn.edu.ctu.lrd." + module + ".adapters..",
                            "vn.edu.ctu.lrd." + module + ".configuration..")
                    .check(classes);
        }
    }
}
