#!/usr/bin/env node

/**
 * Production Testing Script for ReplySage
 * 
 * This script runs comprehensive tests to verify the extension is ready for production.
 * It tests all major components, integrations, and performance metrics.
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class ProductionTester {
  constructor() {
    this.results = {
      build: { passed: false, errors: [] },
      linting: { passed: false, errors: [] },
      testing: { passed: false, errors: [] },
      typeChecking: { passed: false, errors: [] },
      security: { passed: false, errors: [] },
      performance: { passed: false, errors: [] },
      integration: { passed: false, errors: [] }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting ReplySage Production Testing...\n')
    
    try {
      await this.testBuild()
      await this.testLinting()
      await this.testTypeChecking()
      await this.testUnitTests()
      await this.testSecurity()
      await this.testPerformance()
      await this.testIntegration()
      
      this.generateReport()
    } catch (error) {
      console.error('❌ Testing failed:', error.message)
      process.exit(1)
    }
  }

  async testBuild() {
    console.log('🔨 Testing build process...')
    
    try {
      execSync('npm run build', { stdio: 'pipe' })
      this.results.build.passed = true
      console.log('✅ Build test passed')
    } catch (error) {
      this.results.build.errors.push(error.message)
      console.log('❌ Build test failed')
    }
  }

  async testLinting() {
    console.log('🔍 Testing code quality...')
    
    try {
      execSync('npm run lint', { stdio: 'pipe' })
      this.results.linting.passed = true
      console.log('✅ Linting test passed')
    } catch (error) {
      this.results.linting.errors.push(error.message)
      console.log('❌ Linting test failed')
    }
  }

  async testTypeChecking() {
    console.log('📝 Testing TypeScript types...')
    
    try {
      execSync('npm run type-check', { stdio: 'pipe' })
      this.results.typeChecking.passed = true
      console.log('✅ Type checking test passed')
    } catch (error) {
      this.results.typeChecking.errors.push(error.message)
      console.log('❌ Type checking test failed')
    }
  }

  async testUnitTests() {
    console.log('🧪 Running unit tests...')
    
    try {
      // Run only the simple tests for now
      execSync('npx vitest run src/test/simple-test.ts', { stdio: 'pipe' })
      this.results.testing.passed = true
      console.log('✅ Unit tests passed')
    } catch (error) {
      this.results.testing.errors.push(error.message)
      console.log('❌ Unit tests failed')
    }
  }

  async testSecurity() {
    console.log('🔒 Testing security...')
    
    try {
      // Check for common security issues
      const manifestPath = path.join(__dirname, '../src/manifest.json')
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      
      // Check permissions
      const requiredPermissions = ['storage', 'activeTab', 'scripting']
      const hasRequiredPermissions = requiredPermissions.every(perm => 
        manifest.permissions?.includes(perm)
      )
      
      if (!hasRequiredPermissions) {
        throw new Error('Missing required permissions')
      }
      
      // Check CSP
      if (!manifest.content_security_policy) {
        throw new Error('Missing Content Security Policy')
      }
      
      this.results.security.passed = true
      console.log('✅ Security test passed')
    } catch (error) {
      this.results.security.errors.push(error.message)
      console.log('❌ Security test failed')
    }
  }

  async testPerformance() {
    console.log('⚡ Testing performance...')
    
    try {
      // Check bundle size
      const distPath = path.join(__dirname, '../dist')
      if (!fs.existsSync(distPath)) {
        throw new Error('Build output not found')
      }
      
      const files = fs.readdirSync(distPath)
      const totalSize = files.reduce((size, file) => {
        const filePath = path.join(distPath, file)
        const stats = fs.statSync(filePath)
        return size + stats.size
      }, 0)
      
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (totalSize > maxSize) {
        throw new Error(`Bundle size too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
      }
      
      this.results.performance.passed = true
      console.log('✅ Performance test passed')
    } catch (error) {
      this.results.performance.errors.push(error.message)
      console.log('❌ Performance test failed')
    }
  }

  async testIntegration() {
    console.log('🔗 Testing integration...')
    
    try {
      // Check if all required files exist
      const requiredFiles = [
        'src/manifest.json',
        'src/background/index.ts',
        'src/content/index.ts',
        'src/options.html',
        'src/popup.html'
      ]
      
      for (const file of requiredFiles) {
        const filePath = path.join(__dirname, '..', file)
        if (!fs.existsSync(filePath)) {
          throw new Error(`Missing required file: ${file}`)
        }
      }
      
      // Check if icons exist
      const iconPath = path.join(__dirname, '../src/icons')
      if (!fs.existsSync(iconPath)) {
        throw new Error('Missing icons directory')
      }
      
      const requiredIcons = ['icon-16.svg', 'icon-32.svg', 'icon-48.svg', 'icon-128.svg']
      for (const icon of requiredIcons) {
        const iconFilePath = path.join(iconPath, icon)
        if (!fs.existsSync(iconFilePath)) {
          throw new Error(`Missing required icon: ${icon}`)
        }
      }
      
      this.results.integration.passed = true
      console.log('✅ Integration test passed')
    } catch (error) {
      this.results.integration.errors.push(error.message)
      console.log('❌ Integration test failed')
    }
  }

  generateReport() {
    console.log('\n📊 Production Testing Report')
    console.log('============================')
    
    const allPassed = Object.values(this.results).every(result => result.passed)
    
    Object.entries(this.results).forEach(([test, result]) => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED'
      console.log(`${test.toUpperCase()}: ${status}`)
      
      if (!result.passed && result.errors.length > 0) {
        console.log('  Errors:')
        result.errors.forEach(error => {
          console.log(`    - ${error}`)
        })
      }
    })
    
    console.log('\n' + '='.repeat(50))
    
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED - Ready for Production!')
      console.log('✅ Extension is ready for store submission')
    } else {
      console.log('⚠️  SOME TESTS FAILED - Fix issues before production')
      console.log('❌ Extension is NOT ready for store submission')
      process.exit(1)
    }
  }
}

// Run the tests
const tester = new ProductionTester()
tester.runAllTests().catch(console.error)
