package com.trace.backend.service;

import com.trace.backend.dto.response.PageResponse;
import com.trace.backend.repository.BrowseRepository;
import com.trace.backend.tenancy.TenantTransactions;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class BrowseService {
  private final BrowseRepository repository;
  private final TenantTransactions tenants;

  public BrowseService(BrowseRepository repository, TenantTransactions tenants) {
    this.repository = repository;
    this.tenants = tenants;
  }

  public PageResponse<Map<String, Object>> page(
      String kind, int limit, int offset, String q, UUID parent, String type, String status) {
    return page(kind, limit, offset, q, parent, type, status, "", null);
  }

  public PageResponse<Map<String, Object>> page(
      String kind, int limit, int offset, String q, UUID parent, String type, String status,
      String sort, UUID source) {
    if (limit < 1
        || limit > 100
        || offset < 0
        || offset > 1000000
        || q.length() > 255
        || type.length() > 40
        || status.length() > 40
        || (!sort.isEmpty() && (!"assets".equals(kind) || !Set.of("name-desc", "last-seen").contains(sort)))
        || (source != null && !"assets".equals(kind)))
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid pagination or filter");
    return tenants.execute(t -> repository.page(t, kind, limit, offset, q, parent, type, status, sort, source));
  }
}
