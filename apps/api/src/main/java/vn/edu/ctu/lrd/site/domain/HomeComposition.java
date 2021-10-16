package vn.edu.ctu.lrd.site.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.util.*;

public record HomeComposition(
        Block hero,
        UUID heroImageId,
        String heroImageAlt,
        Block introduction,
        String programsKicker,
        String programsTitle,
        Action programsAction,
        List<Program> programs,
        String newsKicker,
        String newsTitle,
        String newsCategory,
        int newsLimit,
        List<UUID> featuredIds,
        Block contact,
        List<Section> sections,
        Footer footer,
        AdmissionsMode admissionsMode,
        List<HeroSlide> heroSlides)
        implements SiteContent {
    public enum AdmissionsMode {
        OPEN,
        LATEST
    }

    public enum Section {
        INTRODUCTION,
        PROGRAMS,
        NEWS,
        CONTACT,
        ADMISSIONS
    }

    public record Action(String label, SiteLink link) {
        public Action {
            label = text(label, 80);
            require(
                    link != null && link.kind() != SiteLink.Kind.GROUP,
                    "INVALID_HOME",
                    "Nút cần có liên kết.");
        }

        void validate() {
            require(!label.isBlank(), "INVALID_HOME", "Vui lòng đặt nhãn cho nút.");
        }
    }

    public record Block(String kicker, String title, String body, Action action) {
        public Block {
            kicker = text(kicker, 120);
            title = text(title, 160);
            body = text(body, 2000);
        }

        void validate() {
            require(
                    !title.isBlank() && !body.isBlank(),
                    "INVALID_HOME",
                    "Tiêu đề và nội dung của khối không được để trống.");
            if (action != null) action.validate();
        }
    }

    public record HeroSlide(Block content, UUID imageId, String imageAlt) {
        public HeroSlide {
            require(content != null, "INVALID_HOME", "Slide cần có nội dung.");
            imageAlt = text(imageAlt, 300);
        }

        void validate() {
            content.validate();
            require(imageId != null && !imageAlt.isBlank(),
                    "INVALID_HOME", "Slide bổ sung cần ảnh và mô tả ảnh.");
        }
    }

    public record Program(UUID id, String kicker, String title, String body, Action action) {
        public Program {
            require(
                    id != null && action != null,
                    "INVALID_HOME",
                    "Chương trình cần mã và liên kết.");
            kicker = text(kicker, 120);
            title = text(title, 160);
            body = text(body, 1000);
        }

        void validate() {
            require(
                    action.link().kind() == SiteLink.Kind.PROGRAM
                            || !title.isBlank() && !body.isBlank(),
                    "INVALID_HOME",
                    "Điền tên và mô tả chương trình.");
            action.validate();
        }
    }

    public record Footer(String description, String address, String email) {
        public Footer {
            description = text(description, 500);
            address = text(address, 500);
            email = text(email, 254);
        }

        void validate() {
            require(
                    !address.isBlank() && email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"),
                    "INVALID_HOME",
                    "Thông tin liên hệ cần địa chỉ và email hợp lệ.");
        }
    }

    public HomeComposition(
            Block hero,
            UUID heroImageId,
            String heroImageAlt,
            Block introduction,
            String programsKicker,
            String programsTitle,
            Action programsAction,
            List<Program> programs,
            String newsKicker,
            String newsTitle,
            String newsCategory,
            int newsLimit,
            List<UUID> featuredIds,
            Block contact,
            List<Section> sections,
            Footer footer) {
        this(
                hero,
                heroImageId,
                heroImageAlt,
                introduction,
                programsKicker,
                programsTitle,
                programsAction,
                programs,
                newsKicker,
                newsTitle,
                newsCategory,
                newsLimit,
                featuredIds,
                contact,
                sections,
                footer,
                AdmissionsMode.OPEN,
                List.of());
    }

    public HomeComposition(
            Block hero, UUID heroImageId, String heroImageAlt, Block introduction,
            String programsKicker, String programsTitle, Action programsAction,
            List<Program> programs, String newsKicker, String newsTitle, String newsCategory,
            int newsLimit, List<UUID> featuredIds, Block contact, List<Section> sections,
            Footer footer, AdmissionsMode admissionsMode) {
        this(hero, heroImageId, heroImageAlt, introduction, programsKicker, programsTitle,
                programsAction, programs, newsKicker, newsTitle, newsCategory, newsLimit,
                featuredIds, contact, sections, footer, admissionsMode, List.of());
    }

    public HomeComposition {
        admissionsMode = admissionsMode == null ? AdmissionsMode.OPEN : admissionsMode;
        require(
                hero != null
                        && introduction != null
                        && contact != null
                        && footer != null
                        && programsAction != null
                        && programs != null
                        && sections != null
                        && featuredIds != null,
                "INVALID_HOME",
                "Thiếu cấu trúc trang chủ.");
        heroImageAlt = text(heroImageAlt, 300);
        programsKicker = text(programsKicker, 120);
        programsTitle = text(programsTitle, 160);
        newsKicker = text(newsKicker, 120);
        newsTitle = text(newsTitle, 160);
        newsCategory = text(newsCategory, 30);
        programs = List.copyOf(programs);
        sections = List.copyOf(sections);
        featuredIds = List.copyOf(featuredIds);
        heroSlides = heroSlides == null ? List.of() : List.copyOf(heroSlides);
        require(
                heroSlides.size() <= 5
                        && programs.size() <= 6
                        && programs.stream().map(Program::id).distinct().count() == programs.size()
                        && sections.size() <= 5
                        && new HashSet<>(sections).size() == sections.size()
                        && newsLimit >= 1
                        && newsLimit <= 12
                        && featuredIds.size() <= newsLimit
                        && new HashSet<>(featuredIds).size() == featuredIds.size()
                        && (newsCategory.isEmpty() || newsCategory.matches("[A-Z][A-Z0-9_]{2,39}")),
                "INVALID_HOME",
                "Số lượng khối, chương trình hoặc tin nổi bật không hợp lệ.");
    }

    private static String text(String value, int max) {
        require(
                value != null && value.length() <= max,
                "INVALID_HOME",
                "Nội dung trống hoặc vượt quá độ dài cho phép.");
        return value.strip();
    }

    public void validateForPublication() {
        hero.validate();
        heroSlides.forEach(HeroSlide::validate);
        footer.validate();
        require(
                heroImageId == null || !heroImageAlt.isBlank(),
                "INVALID_HOME",
                "Ảnh đại diện cần mô tả.");
        if (sections.contains(Section.INTRODUCTION)) introduction.validate();
        if (sections.contains(Section.PROGRAMS)) {
            require(
                    !programsTitle.isBlank() && !programs.isEmpty(),
                    "INVALID_HOME",
                    "Khối đào tạo cần tiêu đề và ít nhất một chương trình.");
            programs.forEach(Program::validate);
            programsAction.validate();
        }
        if (sections.contains(Section.NEWS))
            require(!newsTitle.isBlank(), "INVALID_HOME", "Khối tin tức cần tiêu đề.");
        if (sections.contains(Section.CONTACT)) contact.validate();
    }

    public List<SiteLink> links() {
        var result = new ArrayList<SiteLink>();
        if (hero.action() != null) result.add(hero.action().link());
        heroSlides.stream().map(HeroSlide::content).map(Block::action).filter(Objects::nonNull)
                .forEach(action -> result.add(action.link()));
        if (sections.contains(Section.INTRODUCTION) && introduction.action() != null)
            result.add(introduction.action().link());
        if (sections.contains(Section.PROGRAMS)) {
            result.add(programsAction.link());
            programs.forEach(p -> result.add(p.action().link()));
        }
        if (sections.contains(Section.CONTACT) && contact.action() != null)
            result.add(contact.action().link());
        if (sections.contains(Section.NEWS))
            featuredIds.forEach(
                    id -> result.add(new SiteLink(SiteLink.Kind.ARTICLE, id.toString())));
        return List.copyOf(result);
    }

    public Set<UUID> assetIds() {
        var result = new HashSet<UUID>();
        if (heroImageId != null) result.add(heroImageId);
        heroSlides.stream().map(HeroSlide::imageId).filter(Objects::nonNull).forEach(result::add);
        return Set.copyOf(result);
    }

    public boolean hasAnchor(String anchor) {
        return switch (anchor) {
            case "gioi-thieu" -> sections.contains(Section.INTRODUCTION);
            case "dao-tao" -> sections.contains(Section.PROGRAMS);
            case "tin-tuc" -> sections.contains(Section.NEWS);
            case "ket-noi" -> sections.contains(Section.CONTACT);
            case "lien-he" -> true;
            case "tuyen-sinh" -> sections.contains(Section.ADMISSIONS);
            default -> false;
        };
    }
}
