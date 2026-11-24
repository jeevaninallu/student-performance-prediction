
pipeline {
    agent any

    stages {
        stage('Verify Source Code') {
            steps {
                echo 'Checking project source code...'
                bat 'git rev-parse --show-toplevel'
            }
        }

        stage('Verify Docker') {
            steps {
                bat 'docker --version'
                bat 'docker compose version'
            }
        }

        stage('Prepare Environment Files') {
            steps {
                withCredentials([
                    file(credentialsId: 'frontend-env', variable: 'FRONTEND_ENV'),
                    file(credentialsId: 'backend-env', variable: 'BACKEND_ENV'),
                    file(credentialsId: 'ml-service-env', variable: 'ML_ENV')
                ]) {
                    bat '''
                        copy /Y "%FRONTEND_ENV%" "frontend\\.env"
                        copy /Y "%BACKEND_ENV%" "backend\\.env"
                        copy /Y "%ML_ENV%" "ml_service\\.env"
                    '''
                }
                echo 'Environment files prepared.'
            }
        }

        stage('Validate Docker Compose') {
            steps {
                bat 'docker compose --env-file frontend/.env config --quiet'
                echo 'Docker Compose configuration is valid!'
            }
        }

        stage('Build Docker Images') {
            steps {
                bat 'docker compose --env-file frontend/.env build'
                echo 'Docker images built successfully!'
            }
        }

        stage('Deploy Application') {
            steps {
                echo 'Deploying application using Docker Compose...'
                bat 'docker compose --env-file frontend/.env up -d'
                echo 'Application deployment command completed!'
            }
        }
    }

    post {
        always {
            bat '''
                if exist frontend\\.env del /Q frontend\\.env
                if exist backend\\.env del /Q backend\\.env
                if exist ml_service\\.env del /Q ml_service\\.env
            '''
            echo 'Temporary environment files cleaned up.'
        }
    }
}
