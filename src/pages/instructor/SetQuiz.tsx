import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, Save, Shuffle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db, Course, Question } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface QuizQuestion {
  id?: number;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  points: number;
}

export const SetQuiz: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [quizTitle, setQuizTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [autoGenCount, setAutoGenCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    if (!user?.id) return;
    
    try {
      // Only load courses created by this instructor
      const instructorCourses = await db.courses
        .where('instructorId')
        .equals(user.id)
        .toArray();
      setCourses(instructorCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options![optionIndex] = value;
      setQuestions(updatedQuestions);
    }
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const generateAutoQuiz = async () => {
    if (!selectedCourse) {
      toast({
        title: "Select Course",
        description: "Please select a course first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const course = courses.find(c => c.id?.toString() === selectedCourse);
      if (!course) return;

      // Generate questions based on course content
      const generatedQuestions: QuizQuestion[] = [];
      
      for (let i = 0; i < autoGenCount; i++) {
        const questionTypes: ('multiple_choice' | 'true_false' | 'short_answer')[] = ['multiple_choice', 'true_false', 'short_answer'];
        const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        
        let question: QuizQuestion;
        
        switch (randomType) {
          case 'multiple_choice':
            question = {
              type: 'multiple_choice',
              question: `What is a key concept in ${course.name}? (Question ${i + 1})`,
              options: [
                'Option A - Correct Answer',
                'Option B - Incorrect',
                'Option C - Incorrect',
                'Option D - Incorrect'
              ],
              correctAnswer: 'Option A - Correct Answer',
              points: 2
            };
            break;
          case 'true_false':
            question = {
              type: 'true_false',
              question: `${course.name} involves practical applications. (Question ${i + 1})`,
              options: ['True', 'False'],
              correctAnswer: 'True',
              points: 1
            };
            break;
          case 'short_answer':
            question = {
              type: 'short_answer',
              question: `Explain a fundamental principle of ${course.name}. (Question ${i + 1})`,
              correctAnswer: 'Sample answer for fundamental principle',
              points: 3
            };
            break;
        }
        
        generatedQuestions.push(question);
      }

      setQuestions(generatedQuestions);
      setQuizTitle(`${course.name} - Auto Generated Quiz`);
      
      toast({
        title: "Quiz Generated",
        description: `Generated ${autoGenCount} questions for ${course.name}`,
      });
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Error",
        description: "Failed to generate quiz",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveQuiz = async () => {
    if (!selectedCourse || !quizTitle || questions.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and add at least one question",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create a question bank first
      const bankId = await db.questionBanks.add({
        instructorId: user!.id!,
        name: `${quizTitle} - Question Bank`,
        description: `Questions for ${quizTitle}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Add questions to the bank
      const questionIds: number[] = [];
      for (const question of questions) {
        const questionId = await db.questions.add({
          bankId,
          type: question.type,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          points: question.points,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        questionIds.push(questionId);
      }

      // Create a dummy session for the quiz (in a real app, this would be linked to actual class sessions)
      const sessionId = await db.classSessions.add({
        courseId: parseInt(selectedCourse),
        instructorId: user!.id!,
        title: quizTitle,
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        checkInMethod: 'qr',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Create the quiz
      await db.quizzes.add({
        sessionId,
        instructorId: user!.id!,
        title: quizTitle,
        timeLimit,
        isRandomized: true,
        isActive: true,
        questions: questionIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Quiz Created",
        description: `${quizTitle} has been created and is available to students`,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({
        title: "Error",
        description: "Failed to save quiz",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Set Quiz</h1>
            <p className="text-muted-foreground mt-1">Create or auto-generate quizzes for your courses</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="manual">Manual Creation</TabsTrigger>
          <TabsTrigger value="auto">Auto Generate</TabsTrigger>
        </TabsList>

        {/* Quiz Settings */}
        <GlassCard variant="intense">
          <h2 className="text-xl font-semibold text-glass-foreground mb-4">Quiz Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course" className="text-glass-foreground font-medium">Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="glass border-glass-border/30 bg-glass/5 text-glass-foreground">
                  <SelectValue placeholder={courses.length > 0 ? "Select course" : "No courses available"} />
                </SelectTrigger>
                <SelectContent className="glass border-glass-border/30 bg-glass text-glass-foreground">
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id!.toString()}>
                      {course.name} ({course.code})
                    </SelectItem>
                  ))}
                  {courses.length === 0 && (
                    <SelectItem value="no-courses" disabled>
                      No courses available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {courses.length === 0 && (
                <p className="text-sm text-warning mt-1">
                  You need to create a course first before setting quizzes.{' '}
                  <Link to="/instructor/create-course" className="underline">
                    Create Course
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-glass-foreground font-medium">Quiz Title</Label>
              <Input
                id="title"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Enter quiz title"
                className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit" className="text-glass-foreground font-medium">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                min="5"
                max="180"
                className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
              />
            </div>
          </div>
        </GlassCard>

        <TabsContent value="auto" className="space-y-6">
          <GlassCard variant="intense">
            <h2 className="text-xl font-semibold text-glass-foreground mb-4">Auto Generate Quiz</h2>
            <div className="flex items-end space-x-4">
              <div className="space-y-2">
                <Label htmlFor="questionCount" className="text-glass-foreground font-medium">Number of Questions</Label>
                <Input
                  id="questionCount"
                  type="number"
                  value={autoGenCount}
                  onChange={(e) => setAutoGenCount(parseInt(e.target.value))}
                  min="1"
                  max="20"
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground w-32"
                />
              </div>
              <Button
                variant="primary"
                onClick={generateAutoQuiz}
                disabled={isLoading || !selectedCourse || courses.length === 0}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    <Shuffle size={16} />
                    Generate Quiz
                  </>
                )}
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <GlassCard variant="intense">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-glass-foreground">Questions</h2>
              <Button variant="primary" onClick={addQuestion}>
                <Plus size={16} />
                Add Question
              </Button>
            </div>

            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={index} className="glass p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-glass-foreground">Question {index + 1}</h3>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label className="text-glass-foreground font-medium">Question Type</Label>
                      <Select
                        value={question.type}
                        onValueChange={(value: 'multiple_choice' | 'true_false' | 'short_answer') =>
                          updateQuestion(index, 'type', value)
                        }
                      >
                        <SelectTrigger className="glass border-glass-border/30 bg-glass/5 text-glass-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass border-glass-border/30 bg-glass text-glass-foreground">
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-glass-foreground font-medium">Points</Label>
                      <Input
                        type="number"
                        value={question.points}
                        onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value))}
                        min="1"
                        max="10"
                        className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-glass-foreground font-medium">Question</Label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                        placeholder="Enter your question here..."
                        className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                        rows={2}
                      />
                    </div>

                    {question.type === 'multiple_choice' && (
                      <div className="space-y-2">
                        <Label className="text-glass-foreground font-medium">Options</Label>
                        {question.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <span className="text-glass-foreground font-medium w-8">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            <Input
                              value={option}
                              onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                              className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === 'true_false' && (
                      <div className="space-y-2">
                        <Label className="text-glass-foreground font-medium">Options</Label>
                        <div className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-glass-foreground">A. True</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-glass-foreground">B. False</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-glass-foreground font-medium">Correct Answer</Label>
                      {question.type === 'multiple_choice' ? (
                        <Select
                          value={question.correctAnswer}
                          onValueChange={(value) => updateQuestion(index, 'correctAnswer', value)}
                        >
                          <SelectTrigger className="glass border-glass-border/30 bg-glass/5 text-glass-foreground">
                            <SelectValue placeholder="Select correct answer" />
                          </SelectTrigger>
                          <SelectContent className="glass border-glass-border/30 bg-glass text-glass-foreground">
                            {question.options?.map((option, optionIndex) => (
                              <SelectItem key={optionIndex} value={option}>
                                {String.fromCharCode(65 + optionIndex)}. {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : question.type === 'true_false' ? (
                        <Select
                          value={question.correctAnswer}
                          onValueChange={(value) => updateQuestion(index, 'correctAnswer', value)}
                        >
                          <SelectTrigger className="glass border-glass-border/30 bg-glass/5 text-glass-foreground">
                            <SelectValue placeholder="Select correct answer" />
                          </SelectTrigger>
                          <SelectContent className="glass border-glass-border/30 bg-glass text-glass-foreground">
                            <SelectItem value="True">True</SelectItem>
                            <SelectItem value="False">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Textarea
                          value={question.correctAnswer}
                          onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                          placeholder="Enter the correct answer or key points..."
                          className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                          rows={2}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {questions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No questions added yet. Click "Add Question" to start creating your quiz.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        {questions.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="lg"
              onClick={saveQuiz}
              disabled={isLoading || courses.length === 0}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  <Save size={16} />
                  Save Quiz
                </>
              )}
            </Button>
          </div>
        )}
      </Tabs>
    </div>
  );
};