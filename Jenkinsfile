
pipeline {
    agent any

    stages {
        stage('Verify Source Code') {
            steps {
                echo 'Checking project source code...'
                bat 'git rev-parse --show-toplevel'
                echo 'Source code checkout successful!'
            }
        }

        stage('Verify Docker') {
            steps {
                echo 'Checking Docker installation...'
                bat 'docker --version'
                bat 'docker compose version'
                echo 'Docker verification completed!'
            }
        }

        stage('Validate Docker Compose') {
            steps {
                echo 'Validating Docker Compose configuration...'
                bat 'docker compose --env-file frontend/.env config --quiet'
                echo 'Docker Compose configuration is valid!'
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building application Docker images...'
                bat 'docker compose --env-file frontend/.env build'
                echo 'Docker images built successfully!'
            }
        }
    }
}
