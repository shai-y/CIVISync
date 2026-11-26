package com.citizen_assistance.lgu.model;

import jakarta.validation.constraints.*;
import java.util.UUID;

public final class Forms {
    private Forms() {}

    public record Registration(@NotBlank @Size(max=120) String fullName,
        @NotBlank @Email @Size(max=254) String email, @NotNull @Pattern(regexp="09[0-9]{9}") String mobileNumber,
        @NotBlank @Size(max=100) String barangay, @NotBlank @Size(min=8,max=128) String password,
        @NotNull String confirmPassword) {}

    public record Filing(@NotNull UUID submission, @NotBlank @Pattern(regexp="Flood assistance|Typhoon relief|Medical assistance|Fire|Earthquake|Evacuation assistance|Other") String category,
        @NotBlank @Size(max=200) String location, @NotBlank @Size(max=1200) String details) {}

    public record Review(@NotNull @PositiveOrZero Integer revision, @NotBlank String status,
        @NotBlank @Pattern(regexp="Low|Medium|High|Critical") String priority,
        @Positive Long teamId, @NotNull @Size(max=500) String note) {}

    public record Team(@NotBlank @Size(max=100) String teamName, @NotBlank @Size(max=100) String teamCategory,
        @NotBlank @Size(max=120) String teamLeader, @NotNull @Min(1) @Max(10000) Integer teamMembers) {}

    public record Notice(@NotBlank @Size(max=150) String title, @NotBlank @Pattern(regexp="Typhoon|Flood|Earthquake|Fire|Evacuation|Notice") String category,
        @NotBlank @Size(max=2000) String message) {}

    public record Access(@NotNull Boolean enabled) {}
}
