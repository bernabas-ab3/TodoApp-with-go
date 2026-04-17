package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)
type Config struct {
	DatabaseURL string
	Port        string
	JWTSecret   string
}

func Load() (*Config, error) {
	var err error= godotenv.Load()
	if err != nil{
		log.Println("Warning: .env file not found, using environment variables")
	} 
	port := os.Getenv("PORT")
	if port == "" {
		port = "10000"
	}
    var config *Config = &Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        port,
		JWTSecret:   os.Getenv("JWT_SECRET"),
	}

	if config.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	if config.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	return config, nil
}
