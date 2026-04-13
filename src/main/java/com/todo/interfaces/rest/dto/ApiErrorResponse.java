package com.todo.interfaces.rest.dto;

import java.util.List;

public class ApiErrorResponse {

    private final List<ApiError> errors;

    public ApiErrorResponse(List<ApiError> errors) {
        this.errors = errors;
    }

    public List<ApiError> getErrors() {
        return errors;
    }

    public static class ApiError {
        private final String field;
        private final String message;

        public ApiError(String field, String message) {
            this.field = field;
            this.message = message;
        }

        public String getField() { return field; }
        public String getMessage() { return message; }
    }
}
