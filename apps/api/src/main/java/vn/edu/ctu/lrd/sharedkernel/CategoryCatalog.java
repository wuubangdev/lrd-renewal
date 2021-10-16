package vn.edu.ctu.lrd.sharedkernel;

/** Read-only check shared by content publishing and site composition. */
public interface CategoryCatalog {
    boolean exists(String code);
}
