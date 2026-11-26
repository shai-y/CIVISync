package com.citizen_assistance.lgu.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {
	
	@GetMapping("/api/status")
	public Map<String, String> getSystemStatus() {
		
		return Map.of(
				"systemName", "LGU Citizen Assitance",
				"status", "Running",
				"message", "The Java backend is successfully connected!"
				);
	}
}
