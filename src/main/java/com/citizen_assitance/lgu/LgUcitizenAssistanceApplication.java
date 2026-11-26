package com.citizen_assitance.lgu;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {
	    "com.citizen_assitance.lgu",
	    "com.citizen_assistance.lgu"
	})
public class LgUcitizenAssistanceApplication {

	public static void main(String[] args) {
		SpringApplication.run(LgUcitizenAssistanceApplication.class, args);
	}

}
