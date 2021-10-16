package vn.edu.ctu.lrd.academics.application.port;

import vn.edu.ctu.lrd.academics.domain.*;

import java.time.Instant;
import java.util.*;

public interface AcademicRepository {
    void lockChanges();

    Optional<AcademicProgram> program(UUID id);

    Optional<AdmissionCampaign> admission(UUID id);

    void insert(AcademicProgram p);

    void insert(AdmissionCampaign a);

    void save(AcademicProgram p, long expected);

    void save(AdmissionCampaign a, long expected);

    List<AcademicProgram> programs(String query, String locale, int page, int size);

    List<AdmissionCampaign> admissions(String query, String locale, int page, int size);

    long count(String kind, String query, String locale);

    List<AcademicProgram.ProgramEdition> programHistory(UUID id);

    List<AdmissionCampaign.AdmissionEdition> admissionHistory(UUID id);

    Optional<AcademicProgram.ProgramEdition> programEdition(UUID id, UUID edition);

    Optional<AdmissionCampaign.AdmissionEdition> admissionEdition(UUID id, UUID edition);

    boolean hasActiveAdmissions(UUID program, Instant now);
}
